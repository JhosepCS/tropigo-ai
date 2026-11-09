import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireAuth,
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["SUPERADMIN", "ADMIN", "OPERATOR", "MERCHANT_OWNER"];

/**
 * GET /api/orders
 * Lista de pedidos reales para el CRM. Requiere sesión autenticada.
 * Un dueño de comercio solo puede ver los pedidos de sus propios comercios.
 */
export async function GET(_req: NextRequest) {
  try {
    const session = await requireAuth();

    if (!ALLOWED_ROLES.includes(session.role)) {
      throw new ForbiddenError("No tienes permiso para consultar pedidos.");
    }

    const where: any = {};

    if (session.role === "MERCHANT_OWNER") {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        include: { ownedMerchants: { select: { id: true } } },
      });
      const merchantIds = user?.ownedMerchants.map((m) => m.id) || [];
      if (merchantIds.length === 0) {
        return NextResponse.json({ success: true, orders: [], count: 0 });
      }
      where.merchantId = { in: merchantIds };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: true,
        merchant: true,
        assignedRider: true,
        deliveryZone: true,
        items: true,
        statusHistory: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({
      success: true,
      orders,
      count: orders.length,
    });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    console.error("Error al obtener pedidos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener pedidos" },
      { status: 500 }
    );
  }
}
