import { NextRequest, NextResponse } from "next/server";
import {
  requireRole,
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/auth/rbac";
import {
  assignRiderToOrder,
  OrderAccessError,
  OrderTransitionError,
} from "@/lib/orders/order-service";
import { sendOrderStatusNotification } from "@/lib/whatsapp/notifications";

/**
 * POST /api/orders/assign-rider
 * Asigna un repartidor a un pedido listo para recojo. Solo administración y
 * despacho pueden asignar. El servicio central valida estado y disponibilidad.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(["SUPERADMIN", "ADMIN", "OPERATOR"]);
    const body = await req.json();
    const orderId = String(body?.orderId || "").trim();
    const riderId = String(body?.riderId || "").trim();

    if (!orderId || !riderId) {
      return NextResponse.json(
        { error: "orderId y riderId son requeridos" },
        { status: 400 }
      );
    }

    const order = await assignRiderToOrder({
      orderId,
      riderId,
      actorUserId: session.userId,
    });

    // Notificar al cliente por WhatsApp de la asignación y link de seguimiento/pago
    sendOrderStatusNotification(order, "ASIGNADO").catch(() => {});

    return NextResponse.json({ success: true, order });
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
    console.error("Error al asignar repartidor:", error);
    return NextResponse.json(
      { error: "Error al asignar repartidor" },
      { status: 500 }
    );
  }
}
