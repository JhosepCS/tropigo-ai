import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireMemoryAdmin,
} from "@/lib/memory/auth";
import {
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/customers
 * Lista clientes reales con un vistazo de su memoria persistente.
 * Solo administración/operación. Nunca expone datos a comercios ni riders.
 */
export async function GET(req: NextRequest) {
  try {
    await requireMemoryAdmin();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "24", 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          _count: {
            select: {
              orders: true,
              conversations: true,
              memoryFacts: true,
              conversationSummaries: true,
            },
          },
          memoryFacts: {
            orderBy: { updatedAt: "desc" },
            take: 3,
          },
          conversations: {
            orderBy: { lastMessageAt: "desc" },
            take: 1,
            select: {
              id: true,
              channel: true,
              status: true,
              lastMessageAt: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error al listar clientes con memoria:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar los clientes." },
      { status: 500 }
    );
  }
}
