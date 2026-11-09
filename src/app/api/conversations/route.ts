import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rawConversations = await prisma.conversation.findMany({
      include: {
        customer: true,
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { lastMessageAt: "desc" },
    });

    // Enriquecer cada mensaje con su estado de entrega de Meta
    const conversations = rawConversations.map((c) => ({
      id: c.id,
      status: c.status,
      channel: c.channel,
      lastMessageAt: c.lastMessageAt.toISOString(),
      customer: c.customer
        ? {
            id: c.customer.id,
            name: c.customer.name || `Cliente (+${c.customer.phone})`,
            phone: c.customer.phone,
            address: c.customer.defaultAddress || "",
            zone: c.customer.referencePoint || "",
          }
        : null,
      messages: c.messages.map((m) => {
        let deliveryStatus = "SENT";
        let wamid: string | undefined;
        try {
          if (m.rawPayload) {
            const parsed = JSON.parse(m.rawPayload);
            deliveryStatus = parsed.deliveryStatus || (m.sender === "CUSTOMER" ? "READ" : "SENT");
            wamid = parsed.wamid;
          }
        } catch {}

        return {
          id: m.id,
          sender: m.sender.toUpperCase(),
          content: m.content,
          mediaType: m.mediaType || "text",
          latitude: m.latitude,
          longitude: m.longitude,
          transcription: m.transcription,
          toolCallsJson: m.toolCallsJson,
          providerModel: m.providerModel,
          deliveryStatus,
          wamid,
          createdAt: m.createdAt.toISOString(),
        };
      }),
    }));

    return NextResponse.json({
      success: true,
      conversations,
      count: conversations.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[API Conversations] Error al obtener conversaciones:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
