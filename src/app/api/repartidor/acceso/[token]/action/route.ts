import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  acceptOrderAsRider,
  markRiderArrivedAtMerchant,
  OrderAccessError,
  OrderTransitionError,
  transitionOrderStatus,
} from "@/lib/orders/order-service";
import { sendOrderStatusNotification } from "@/lib/whatsapp/notifications";

export const dynamic = "force-dynamic";

const ACTIONS = ["accept", "arrived", "pickup", "delivered"] as const;
type Action = (typeof ACTIONS)[number];

/**
 * POST /api/repartidor/acceso/[token]/action
 * Acciones de 1 toque desde el enlace personal enviado por WhatsApp. El token
 * identifica al repartidor; no se requiere correo ni contraseña.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const rider = await prisma.rider.findUnique({
      where: { accessToken: token },
      select: { id: true, name: true, isActive: true, status: true },
    });

    if (!rider) {
      return NextResponse.json(
        { error: "Enlace no válido. Pide uno nuevo a TropiGO." },
        { status: 404 }
      );
    }
    if (!rider.isActive || rider.status !== "ACTIVO") {
      return NextResponse.json(
        { error: "Tu cuenta está en pausa o todavía no está aprobada." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const orderId = String(body?.orderId || "").trim();
    const action = String(body?.action || "").trim() as Action;

    if (!orderId || !ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: "Acción no válida." },
        { status: 400 }
      );
    }

    let order: any;

    if (action === "accept") {
      order = await acceptOrderAsRider(rider.id, orderId);
    } else if (action === "arrived") {
      order = await markRiderArrivedAtMerchant(rider.id, orderId);
    } else {
      const nextStatus = action === "pickup" ? "EN_CAMINO" : "ENTREGADO";
      order = await transitionOrderStatus({
        orderId,
        nextStatus,
        tokenActor: { role: "RIDER", riderId: rider.id, name: rider.name },
        comment:
          action === "pickup"
            ? "Repartidor recogió el pedido desde su enlace de WhatsApp"
            : "Repartidor marcó el pedido como entregado desde su enlace de WhatsApp",
      });
      // El cliente recibe el aviso de "en camino" o "entregado".
      sendOrderStatusNotification(order, nextStatus).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        status: order.status,
        riderAcceptedAt: order.riderAcceptedAt || null,
        riderArrivedAt: order.riderArrivedAt || null,
      },
    });
  } catch (error: any) {
    if (error instanceof OrderAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof OrderTransitionError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[RiderAccessAction] Error:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar la carrera. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
