import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole(["SUPERADMIN", "ADMIN", "OPERATOR"]);

    const rawConversations = await prisma.conversation.findMany({
      include: {
        customer: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 200,
        },
      },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
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
      messages: [...c.messages].reverse().map((m) => {
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
          type: m.mediaType || "text",
          mediaType: m.mediaType || "text",
          latitude: m.latitude,
          longitude: m.longitude,
          ...(m.latitude != null && m.longitude != null
            ? {
                locationData: {
                  name: "Ubicación GPS",
                  address: m.content,
                  zone: "",
                },
              }
            : {}),
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
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("[API Conversations] Error al obtener conversaciones:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
