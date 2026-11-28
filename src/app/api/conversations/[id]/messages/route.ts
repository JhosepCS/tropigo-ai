import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

const MAX_TAKE = 200;

/**
 * GET /api/conversations/[id]/messages
 *
 * Devuelve el historial de un solo chat. El panel lo consulta únicamente para
 * la conversación abierta, en lugar de bajar los mensajes de todas.
 *
 * Parámetros:
 * - take: cantidad de mensajes (1-200, por defecto 80).
 * - before: ISO de fecha para cargar mensajes más antiguos (paginación).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["SUPERADMIN", "ADMIN", "OPERATOR"]);

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const take = Math.min(
      MAX_TAKE,
      Math.max(1, Number(searchParams.get("take") || 80))
    );
    const before = searchParams.get("before");
    const beforeDate = before ? new Date(before) : null;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            defaultAddress: true,
            referencePoint: true,
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversación no encontrada." },
        { status: 404 }
      );
    }

    const rows = await prisma.message.findMany({
      where: {
        conversationId: id,
        ...(beforeDate && !Number.isNaN(beforeDate.getTime())
          ? { createdAt: { lt: beforeDate } }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: take + 1,
    });

    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;

    const messages = [...page].reverse().map((m) => {
      let deliveryStatus = "SENT";
      let wamid: string | undefined;
      try {
        if (m.rawPayload) {
          const parsed = JSON.parse(m.rawPayload);
          deliveryStatus =
            parsed.deliveryStatus || (m.sender === "CUSTOMER" ? "READ" : "SENT");
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
    });

    return NextResponse.json({
      success: true,
      conversation: {
        id: conversation.id,
        status: conversation.status,
        channel: conversation.channel,
        lastMessageAt: conversation.lastMessageAt.toISOString(),
        customer: conversation.customer
          ? {
              id: conversation.customer.id,
              name:
                conversation.customer.name ||
                `Cliente (+${conversation.customer.phone})`,
              phone: conversation.customer.phone,
              address: conversation.customer.defaultAddress || "",
              zone: conversation.customer.referencePoint || "",
            }
          : null,
      },
      messages,
      hasMore,
      oldest: messages[0]?.createdAt || null,
    });
  } catch (error: any) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("[API Conversation Messages] Error:", error);
    return NextResponse.json(
      { error: error?.message || "No se pudo cargar el chat." },
      { status: 500 }
    );
  }
}
