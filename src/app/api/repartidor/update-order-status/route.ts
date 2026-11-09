import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/auth/rbac";
import {
  OrderAccessError,
  OrderTransitionError,
  transitionOrderStatus,
} from "@/lib/orders/order-service";

/**
 * POST /api/repartidor/update-order-status
 * El repartidor asignado (o un operador) avanza el pedido por la máquina de
 * estados. Ya no se acepta cualquier estado ni se autoasigna el pedido.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const orderId = String(body?.orderId || "").trim();
    const status = String(body?.status || "").trim().toUpperCase();
    const comment = body?.comment ? String(body.comment) : undefined;

    if (!orderId || !status) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
    }

    const order = await transitionOrderStatus({
      orderId,
      nextStatus: status,
      actorUserId: session.userId,
      comment: comment || "Actualización desde la app del repartidor",
    });

    return NextResponse.json({ success: true, order });
  } catch (err: any) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof ForbiddenError || err instanceof OrderAccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof OrderTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("Error al actualizar estado del pedido desde repartidor:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
