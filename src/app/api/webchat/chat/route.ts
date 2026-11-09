import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAssistantChat } from "@/lib/ai/assistant";
import { ensureConversationSession } from "@/lib/memory/conversation-summary";
import { buildCustomerMemoryPrompt } from "@/lib/memory/customer-memory";

export async function POST(req: NextRequest) {
  try {
    const { message, history, sessionId } = await req.json();
    if (!message) return NextResponse.json({ error: "Falta mensaje" }, { status: 400 });

    const business = await prisma.businessProfile.findFirst();
    if (business && !business.assistantEnabled) {
      return NextResponse.json({
        reply: "TropiBot se encuentra temporalmente en pausa. Por favor llácanos directamente al +591 74389012.",
      });
    }

    const assistant = await prisma.assistantConfig.findFirst();

    // Guardar o asociar cliente web
    let customer = await prisma.customer.findFirst({
      where: { phone: "+59100000000" },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: "Visitante Web",
          phone: "+59100000000",
          defaultAddress: "Ivirgarzama Web",
        },
      });
    }

    // Conversación aislada por sesión web. La memoria persistente no se
    // comparte entre visitantes de la web.
    const conversation = await ensureConversationSession(
      customer.id,
      "WEBCHAT",
      String(sessionId || "")
    );

    // Registrar mensaje del usuario
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: "CUSTOMER",
        content: message,
      },
    });

    // Construir historial para el LLM
    const memoryContext = await buildCustomerMemoryPrompt(customer.id);

    const formattedMessages = [
      {
        role: "system" as const,
        content: `Eres ${assistant?.name || "TropiBot"}, asistente virtual de TropiGO en Ivirgarzama (Bolivia). Responde con amabilidad cochabambina y precios siempre en Bs.${memoryContext ? `\n\n${memoryContext}` : ""}`,
      },
      ...(history || []).map((h: any) => ({
        role: (h.role === "user" ? "user" : "assistant") as "user" | "assistant",
        content: h.content,
      })),
      { role: "user" as const, content: message },
    ];

    const response = await runAssistantChat(formattedMessages, Boolean(assistant?.safeMode), {
      customerId: customer.id,
      conversationId: conversation.id,
      confirmationVerified: false,
      source: "WEBCHAT",
    });

    // Registrar respuesta del asistente
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: "ASSISTANT",
        content: response.content,
        toolCallsJson: response.toolCalls?.length ? JSON.stringify(response.toolCalls) : null,
      },
    });

    return NextResponse.json({
      reply: response.content,
      toolCalls: response.toolCalls,
    });
  } catch (error: any) {
    console.error("Error en /api/webchat/chat:", error);
    return NextResponse.json(
      { reply: "Lo siento, hubo un problema al procesar tu consulta en TropiGO." },
      { status: 500 }
    );
  }
}
