import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { runAgentChat } from "@/lib/ai/agent";
import { analyzeImage, transcribeAudio, analyzePaymentReceipt, ReceiptAnalysis } from "@/lib/ai/multimodal";
import { getAssistantConfig, buildSystemPrompt } from "@/lib/ai/config-manager";
import { getRealDataContextPrompt } from "@/lib/ai/tools";
import { ensureConversationSession } from "@/lib/memory/conversation-summary";
import { buildCustomerMemoryPrompt } from "@/lib/memory/customer-memory";
import { buildCustomerLocationPrompt } from "@/lib/geo/delivery-center";
import { decodeLoyaltyQrFromImage } from "@/lib/loyalty/qr-decode";
import {
  buildReceiptPromptBlock,
  registerReceiptPayment,
} from "@/lib/payments/receipt-service";
import {
  buildLoyaltyCardPrompt,
  buildCustomerLoyaltyPrompt,
} from "@/lib/loyalty/prompt";
import { extractLoyaltyCode } from "@/lib/loyalty/code";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel Hobby limita el cuerpo de la peticion a 4.5 MB.
const MAX_MEDIA_BYTES = 4 * 1024 * 1024;

/**
 * Cada visitante web tiene un Customer propio derivado de su sessionId.
 * El prefijo +5910 no corresponde a un celular boliviano real y evita
 * colisiones con clientes de WhatsApp. La memoria nunca se comparte.
 */
function phoneForWebSession(sessionId: string): string {
  const hash = crypto.createHash("sha256").update(sessionId).digest("hex");
  const digits = BigInt(`0x${hash.slice(0, 12)}`)
    .toString()
    .padStart(15, "0")
    .slice(-7);
  return `+5910${digits}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = String(body.sessionId || crypto.randomUUID());
    const message = String(body.message || "").trim();
    const mediaBase64 = typeof body.mediaBase64 === "string" ? body.mediaBase64 : "";
    const mediaMimeType = String(body.mediaMimeType || "");
    const mediaName = String(body.mediaName || "");

    if (!message && !mediaBase64) {
      return NextResponse.json({ error: "Falta mensaje o archivo" }, { status: 400 });
    }

    const business = await prisma.businessProfile.findFirst();
    if (business && !business.assistantEnabled) {
      return NextResponse.json({
        reply:
          "TropiBot se encuentra temporalmente en pausa. Por favor llámanos directamente al +591 74389012.",
      });
    }

    // -----------------------------------------------------------------
    // 1. Procesar imagen o audio con Gemini antes de guardar el mensaje
    // -----------------------------------------------------------------
    let userText = message;
    let mediaType = "text";
    let transcription: string | null = null;
    let mediaError: string | null = null;
    let receiptAnalysis: ReceiptAnalysis | null = null;

    if (mediaBase64) {
      const buffer = Buffer.from(mediaBase64, "base64");
      if (buffer.length === 0) {
        return NextResponse.json({ error: "El archivo llegó vacío" }, { status: 400 });
      }
      if (buffer.length > MAX_MEDIA_BYTES) {
        return NextResponse.json(
          { error: "El archivo supera el límite de 4 MB." },
          { status: 413 }
        );
      }

      if (mediaMimeType.startsWith("image/")) {
        mediaType = "image";
        const decodedQr = await decodeLoyaltyQrFromImage(buffer);
        const loyaltyBlock = decodedQr
          ? await buildLoyaltyCardPrompt(decodedQr.code)
          : null;
        const analysis = await analyzeImage(buffer, mediaMimeType, message || mediaName);

        const receiptHints =
          /comprobante|pago|transferencia|tigo|yape|zas|altoke|qr|monto|banco|referencia/i;
        if (
          receiptHints.test(`${message || ""} ${mediaName || ""} ${analysis.text || ""}`)
        ) {
          receiptAnalysis = await analyzePaymentReceipt(buffer, mediaMimeType);
        }

        if (analysis.text) {
          userText = [
            message,
            `[El cliente envió una imagen${mediaName ? `: ${mediaName}` : ""}]`,
            `Contenido detectado en la imagen: ${analysis.text}`,
            loyaltyBlock,
          ]
            .filter(Boolean)
            .join("\n\n");
        } else {
          mediaError = analysis.error || "No se pudo analizar la imagen.";
          userText = [
            message,
            `[El cliente envió una imagen${mediaName ? `: ${mediaName}` : ""}, pero no se pudo analizar. Pídele que describa lo que necesita.]`,
            loyaltyBlock,
          ]
            .filter(Boolean)
            .join("\n\n");
        }
      } else if (mediaMimeType.startsWith("audio/")) {
        mediaType = "audio";
        const result = await transcribeAudio(buffer, mediaMimeType);
        if (result.text) {
          transcription = result.text;
          userText = [
            message,
            `[El cliente envió una nota de voz. Transcripción literal: "${result.text}"]`,
          ]
            .filter(Boolean)
            .join("\n");
        } else {
          mediaError = result.error || "No se pudo transcribir el audio.";
          userText = [
            message,
            "[El cliente envió una nota de voz que no se pudo transcribir. Discúlpate y pídele que repita o escriba.]",
          ]
            .filter(Boolean)
            .join("\n");
        }
      } else {
        return NextResponse.json(
          { error: "Formato no soportado. Envía una imagen o un audio." },
          { status: 415 }
        );
      }
    }

    // Si el cliente escribió su código de fidelidad, adjunta los datos de la
    // tarjeta al mensaje para que la IA los explique.
    const typedLoyaltyCode = extractLoyaltyCode(userText);
    if (typedLoyaltyCode && !userText.includes("[TARJETA DE FIDELIDAD DETECTADA")) {
      const loyaltyBlock = await buildLoyaltyCardPrompt(typedLoyaltyCode);
      if (loyaltyBlock) {
        userText = `${userText}\n\n${loyaltyBlock}`;
      }
    }

    // -----------------------------------------------------------------
    // 2. Cliente aislado por sesión y conversación
    // -----------------------------------------------------------------
    const phone = phoneForWebSession(sessionId);
    let customer = await prisma.customer.findUnique({ where: { phone } });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: "Visitante Web",
          phone,
          defaultAddress: "Ivirgarzama Web",
        },
      });
    }

    if (receiptAnalysis?.isReceipt) {
      try {
        const receiptResult = await registerReceiptPayment({
          customerId: customer.id,
          analysis: receiptAnalysis,
          caption: mediaName || null,
        });
        const receiptBlock = buildReceiptPromptBlock(receiptResult);
        if (receiptBlock) {
          userText = `${userText}\n\n${receiptBlock}`;
        }
      } catch (receiptError: any) {
        console.error(
          "[Webchat] No se pudo registrar el comprobante:",
          receiptError?.message || receiptError
        );
      }
    }

    const conversation = await ensureConversationSession(
      customer.id,
      "WEBCHAT",
      sessionId
    );

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: "CUSTOMER",
        content: userText,
        mediaType,
        transcription,
        rawPayload: JSON.stringify({
          sessionId,
          mediaName: mediaName || null,
          mediaMimeType: mediaMimeType || null,
          mediaError,
        }),
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    if (conversation.status === "HUMAN_TAKEOVER") {
      return NextResponse.json({
        reply:
          "Nuestra operadora de despacho ya tomó esta conversación. En un momento te atenderá personalmente.",
        sessionId,
      });
    }

    // -----------------------------------------------------------------
    // 3. Prompt completo + memoria + herramientas + motor Gemini
    // -----------------------------------------------------------------
    const assistantConfig = await getAssistantConfig();
    const [realDataContext, memoryContext, loyaltyContext, locationContext] = await Promise.all([
      getRealDataContextPrompt(),
      buildCustomerMemoryPrompt(customer.id),
      buildCustomerLoyaltyPrompt(customer.id),
      buildCustomerLocationPrompt(customer.id),
    ]);
    const systemPrompt = buildSystemPrompt(
      assistantConfig,
      [realDataContext, memoryContext, loyaltyContext, locationContext]
        .filter(Boolean)
        .join("\n\n")
    );

    const recentMessages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: 12,
    });

    const chatHistory = recentMessages.reverse().map((m) => ({
      role:
        m.sender === "CUSTOMER"
          ? ("user" as const)
          : m.sender === "ASSISTANT"
          ? ("assistant" as const)
          : ("user" as const),
      content: m.content,
    }));

    const aiResponse = await runAgentChat({
      messages: [{ role: "system", content: systemPrompt }, ...chatHistory],
      config: assistantConfig,
      toolContext: {
        customerId: customer.id,
        conversationId: conversation.id,
        confirmationVerified: false,
        source: "WEBCHAT",
      },
      maxToolRounds: 3,
    });

    const reply =
      aiResponse.content?.trim() ||
      "¡Gracias por escribir a TropiGO! ¿En qué puedo ayudarte hoy?";

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: "ASSISTANT",
        content: reply,
        toolCallsJson: aiResponse.toolCalls?.length
          ? JSON.stringify(aiResponse.toolCalls)
          : null,
        providerModel: `${aiResponse.provider}/${aiResponse.model}`,
        tokensUsed: aiResponse.tokensUsed || null,
      },
    });

    if (aiResponse.operatorHandoff) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { status: "HUMAN_TAKEOVER" },
      });
    }

    return NextResponse.json({
      reply,
      toolCalls: aiResponse.toolCalls || [],
      sessionId,
      provider: aiResponse.provider,
      model: aiResponse.model,
    });
  } catch (error: any) {
    console.error("Error en /api/webchat/chat:", error);
    return NextResponse.json(
      {
        reply:
          "Lo siento, hubo un problema al procesar tu consulta en TropiGO. Intenta nuevamente en unos segundos.",
      },
      { status: 500 }
    );
  }
}
