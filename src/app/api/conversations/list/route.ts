import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/rbac";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const MAX_TAKE = 100;

/**
 * GET /api/conversations/list
 *
 * Lista ligera para el panel: solo metadatos y el último mensaje de cada chat.
 * Evita descargar todos los mensajes de todas las conversaciones en cada
 * refresco (eso congelaba la interfaz y rompía el cambio de chat).
 *
 * Parámetros:
 * - q: busca por nombre, teléfono o contenido de mensajes.
 * - status: AI_ACTIVE | HUMAN_TAKEOVER | CLOSED | ALL
 * - take: tamaño de página (1-100, por defecto 50).
 * - cursor: id de la última conversación de la página anterior.
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole(["SUPERADMIN", "ADMIN", "OPERATOR"]);

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const status = (searchParams.get("status") || "ALL").toUpperCase();
    const cursor = searchParams.get("cursor") || "";
    const take = Math.min(
      MAX_TAKE,
      Math.max(1, Number(searchParams.get("take") || 50))
    );

    const where: Prisma.ConversationWhereInput = {};

    if (status !== "ALL") {
      if (status === "CLOSED") {
        where.status = { in: ["CLOSED", "CERRADA", "CERRADO"] };
      } else if (status === "HUMAN_TAKEOVER" || status === "ATTENTION") {
        where.status = "HUMAN_TAKEOVER";
      } else if (status === "AI_ACTIVE" || status === "ACTIVE") {
        where.status = "AI_ACTIVE";
      }
    }

    if (q) {
      where.OR = [
        { customer: { is: { name: { contains: q, mode: "insensitive" } } } },
        { customer: { is: { phone: { contains: q } } } },
        { messages: { some: { content: { contains: q, mode: "insensitive" } } } },
      ];
    }

    const rows = await prisma.conversation.findMany({
      where,
      orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
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
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            sender: true,
            content: true,
            mediaType: true,
            createdAt: true,
          },
        },
        _count: { select: { messages: true } },
      },
    });

    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    const total = await prisma.conversation.count({ where });

    return NextResponse.json({
      success: true,
      conversations: items.map((c) => {
        const last = c.messages[0] || null;
        return {
          id: c.id,
          status: c.status,
          channel: c.channel,
          lastMessageAt: c.lastMessageAt.toISOString(),
          messageCount: c._count.messages,
          customer: c.customer
            ? {
                id: c.customer.id,
                name: c.customer.name || `Cliente (+${c.customer.phone})`,
                phone: c.customer.phone,
                address: c.customer.defaultAddress || "",
                zone: c.customer.referencePoint || "",
              }
            : null,
          lastMessage: last
            ? {
                sender: last.sender.toUpperCase(),
                content: last.content,
                mediaType: last.mediaType || "text",
                createdAt: last.createdAt.toISOString(),
              }
            : null,
        };
      }),
      total,
      hasMore,
      nextCursor: hasMore ? items[items.length - 1]?.id || null : null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("[API Conversations List] Error:", error);
    return NextResponse.json(
      { error: error?.message || "No se pudo cargar la lista de conversaciones." },
      { status: 500 }
    );
  }
}
