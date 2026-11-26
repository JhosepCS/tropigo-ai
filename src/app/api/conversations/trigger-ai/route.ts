import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAssistantConfig, buildSystemPrompt } from "@/lib/ai/config-manager";
import { runAgentChat } from "@/lib/ai/agent";
import { getRealDataContextPrompt } from "@/lib/ai/tools";
import { sanitizeAssistantReply } from "@/lib/ai/response-format";
import { buildCustomerMemoryPrompt } from "@/lib/memory/customer-memory";
import { buildCustomerLoyaltyPrompt } from "@/lib/loyalty/prompt";
import { buildCustomerLocationPrompt } from "@/lib/geo/delivery-center";
import { WhatsAppAdapterFactory } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { conversationId } = await req.json();
    if (!conversationId) {
      return NextResponse.json({ error: "conversationId requerido" }, { status: 400 });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { customer: true },
    });

    if (!conversation || !conversation.customer) {
      return NextResponse.json({ error: "Conversación o cliente no encontrado" }, { status: 404 });
    }

    const customer = conversation.customer;
    const assistantConfig = await getAssistantConfig();

    const [realDataContext, memoryContext, loyaltyContext, locationContext] = await Promise.all([
      getRealDataContextPrompt(),
      buildCustomerMemoryPrompt(customer.id),
      buildCustomerLoyaltyPrompt(customer.id),
      buildCustomerLocationPrompt(customer.id),
    ]);

    const systemPrompt = buildSystemPrompt(
      assistantConfig,
      [realDataContext, memoryContext, loyaltyContext, locationContext].filter(Boolean).join("\n\n")
    );

    const recentMessages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: 8,
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
        source: "WHATSAPP",
      },
      maxToolRounds: 2,
    });

    const reply =
      sanitizeAssistantReply(aiResponse.content?.trim() || "") ||
      "¿En qué te ayudo? Escribe *menú* para ver las opciones.";

    // Enviar a WhatsApp
    let wamid = "local_sent";
    let sendError: string | null = null;
    try {
      const adapter = await WhatsAppAdapterFactory.getAdapter();
      wamid = await adapter.sendMessage(customer.phone, reply);
    } catch (e: any) {
      console.error("[Trigger AI] Error enviando a WhatsApp:", e);
      sendError = e?.message || "No se pudo enviar el mensaje por WhatsApp.";
    }

    // Guardar en BD
    const savedMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: "ASSISTANT",
        content: reply,
        toolCallsJson: aiResponse.toolCalls?.length
          ? JSON.stringify(aiResponse.toolCalls)
          : null,
        providerModel: `${aiResponse.provider}/${aiResponse.model}`,
        tokensUsed: aiResponse.tokensUsed || null,
        latencyMs: aiResponse.latencyMs || null,
        rawPayload: JSON.stringify({
          wamid,
          deliveryStatus: sendError ? "FAILED" : "SENT",
          error: sendError,
        }),
      },
    });

    // Actualizar conversación a AI_ACTIVE
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        status: "AI_ACTIVE",
        lastMessageAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: savedMessage,
      status: "AI_ACTIVE",
      ...(sendError
        ? {
            warning: `La IA generó la respuesta pero no se pudo enviar a WhatsApp: ${sendError}`,
          }
        : {}),
    });
  } catch (error: any) {
    console.error("[Trigger AI] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
