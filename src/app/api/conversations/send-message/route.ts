import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WhatsAppAdapterFactory } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  try {
    const { conversationId, recipientPhone, content } = await req.json();

    // 1. Guardar mensaje en base de datos
    const saved = await prisma.message.create({
      data: {
        conversationId,
        sender: "human",
        content,
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    // 2. Enviar por el canal activo de WhatsApp (Meta o Baileys)
    if (recipientPhone) {
      try {
        const adapter = await WhatsAppAdapterFactory.getAdapter();
        await adapter.sendMessage(recipientPhone, content);
      } catch (err) {
        console.warn("No se pudo despachar el mensaje por WhatsApp:", err);
      }
    }

    return NextResponse.json({ success: true, message: saved });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
