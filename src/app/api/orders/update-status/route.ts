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
import { sendOrderStatusNotification } from "@/lib/whatsapp/notifications";

/**
 * POST /api/orders/update-status
 * Cambia el estado de un pedido respetando la máquina de estados y los
 * permisos del usuario autenticado (admin/operador, dueño del comercio o
 * repartidor asignado).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const orderId = String(body?.orderId || "").trim();
    const status = String(body?.status || "").trim().toUpperCase();
    const comment = body?.comment ? String(body.comment) : undefined;

    if (!orderId || !status) {
      return NextResponse.json(
        { error: "orderId y status son requeridos" },
        { status: 400 }
      );
    }

    const updated = await transitionOrderStatus({
      orderId,
      nextStatus: status,
      actorUserId: session.userId,
      comment,
    });

    // Notificar al cliente por WhatsApp en background (best-effort, no bloquea)
    sendOrderStatusNotification(updated, status).catch(() => {});

    return NextResponse.json({ success: true, order: updated });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError || error instanceof OrderAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof OrderTransitionError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Error al actualizar estado de orden:", error);
    return NextResponse.json(
      { error: "Error al actualizar estado del pedido" },
      { status: 500 }
    );
  }
}
