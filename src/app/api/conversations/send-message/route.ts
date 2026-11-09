import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WhatsAppAdapterFactory } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { conversationId, recipientPhone: explicitPhone, content } = await req.json();

    if (!conversationId || !content || !content.trim()) {
      return NextResponse.json(
        { error: "conversationId y content son requeridos." },
        { status: 400 }
      );
    }

    // 1. Obtener conversación y cliente
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { customer: true },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: `Conversación ${conversationId} no encontrada.` },
        { status: 404 }
      );
    }

    const recipientPhone = explicitPhone || conversation.customer?.phone;
    if (!recipientPhone) {
      return NextResponse.json(
        { error: "No se encontró el teléfono del cliente para enviar el mensaje por WhatsApp." },
        { status: 400 }
      );
    }

    // 2. Control de duplicados rápidos (Anti-Double Click)
    const recentDuplicate = await prisma.message.findFirst({
      where: {
        conversationId,
        content: content.trim(),
        sender: "OPERATOR",
        createdAt: {
          gte: new Date(Date.now() - 3000), // últimos 3 segundos
        },
      },
    });

    if (recentDuplicate) {
      console.log("[Send Message] Mensaje duplicado omitido por envío rápido.");
      return NextResponse.json({
        success: true,
        message: recentDuplicate,
        duplicatePrevented: true,
      });
    }

    // 3. Enviar a través de WhatsApp Business Cloud API de Meta
    let wamid: string = "local_pending";
    let sendError: string | null = null;

    try {
      const adapter = await WhatsAppAdapterFactory.getAdapter();
      wamid = await adapter.sendMessage(recipientPhone, content.trim());
    } catch (err: any) {
      console.error("[Send Message] Error al enviar mensaje por Cloud API:", err.message);
      sendError = err.message;
    }

    // 4. Registrar mensaje del operador en la base de datos
    const saved = await prisma.message.create({
      data: {
        conversationId,
        sender: "OPERATOR",
        content: content.trim(),
        rawPayload: JSON.stringify({
          wamid,
          deliveryStatus: sendError ? "FAILED" : "SENT",
          sentAt: new Date().toISOString(),
          error: sendError,
          direction: "outbound",
        }),
      },
    });

    // 5. Actualizar conversación a HUMAN_TAKEOVER (operador activo) y timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: "HUMAN_TAKEOVER",
        lastMessageAt: new Date(),
      },
    });

    if (sendError) {
      return NextResponse.json({
        success: false,
        message: saved,
        warning: `Mensaje guardado pero falló el envío por WhatsApp: ${sendError}`,
      });
    }

    return NextResponse.json({
      success: true,
      message: saved,
      wamid,
    });
  } catch (error: any) {
    console.error("[Send Message] Error general:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
