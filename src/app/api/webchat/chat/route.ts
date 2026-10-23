import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAssistantChat } from "@/lib/ai/assistant";

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();
    if (!message) return NextResponse.json({ error: "Falta mensaje" }, { status: 400 });

    const business = await prisma.businessProfile.findFirst();
    if (business && !business.assistantEnabled) {
      return NextResponse.json({
        reply: "El asistente se encuentra temporalmente en pausa. Por favor llámanos directamente al 912 345 678.",
      });
    }

    const assistant = await prisma.assistantConfig.findFirst();
    const services = await prisma.service.findMany({ where: { isActive: true } });
    const faqs = await prisma.faq.findMany();
    const kb = await prisma.knowledgeBase.findFirst();

    // Guardar o asociar contacto web
    let contact = await prisma.contact.findFirst({
      where: { channel: "webchat" },
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          name: "Visitante Web",
          channel: "webchat",
        },
      });
    }

    let conversation = await prisma.conversation.findFirst({
      where: { contactId: contact.id, status: "ai_active" },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          contactId: contact.id,
          channel: "webchat",
          status: "ai_active",
        },
      });
    }

    // Registrar mensaje del usuario
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: "customer",
        content: message,
      },
    });

    // Compilar mensajes para el motor de IA
    const systemPrompt = `Eres ${assistant?.name || "LumenBot"}, asistente virtual de ${business?.name || "Clínica Dental Lumen"}.
Dirección: ${business?.address}. Teléfono: ${business?.phone}.
Horario: L-V 09:00 - 14:00 y 16:00 - 20:00.
Tono: ${assistant?.tone || "cercano"} en español de España.
${assistant?.instructions}

Servicios:
${services.map((s) => `- ${s.name} (${s.durationMinutes} min, ${s.price} €): ${s.description}`).join("\n")}

FAQs:
${faqs.map((f) => `P: ${f.question} | R: ${f.answer}`).join("\n")}

Información adicional:
${kb?.freeText || ""}`;

    const formattedHistory = (history || []).map((h: any) => ({
      role: h.role || (h.sender === "customer" ? "user" : "assistant"),
      content: h.content,
    }));

    const fullMessages = [
      { role: "system" as const, content: systemPrompt },
      ...formattedHistory.slice(-10),
    ];

    const response = await runAssistantChat(fullMessages, Boolean(assistant?.safeMode));

    // Registrar respuesta del asistente en BD
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: "assistant",
        content: response.content,
        toolCallsJson: response.toolCalls?.length ? JSON.stringify(response.toolCalls) : null,
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    return NextResponse.json({ reply: response.content, toolCalls: response.toolCalls });
  } catch (error: any) {
    console.error("Error en webchat:", error);
    return NextResponse.json({ reply: "Lo siento, ha ocurrido un error al procesar tu mensaje." }, { status: 500 });
  }
}
