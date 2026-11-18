import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  OrderAccessError,
  OrderTransitionError,
  transitionOrderStatus,
} from "@/lib/orders/order-service";
import { sendOrderStatusNotification } from "@/lib/whatsapp/notifications";

export const dynamic = "force-dynamic";

const ACTIONS: Record<string, string> = {
  accept: "EN_PREPARACION",
  ready: "LISTO_RECOJO",
  cancel: "CANCELADO",
};

/**
 * POST /api/comercio/acceso/[token]/action
 * El comercio avanza el pedido desde su enlace de WhatsApp:
 * aceptar (en cocina), pedido listo o cancelar.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const merchant = await prisma.merchant.findUnique({
      where: { accessToken: token },
      select: { id: true, name: true },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: "Enlace no válido. Pide uno nuevo a TropiGO." },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const orderId = String(body?.orderId || "").trim();
    const action = String(body?.action || "").trim();
    const nextStatus = ACTIONS[action];

    if (!orderId || !nextStatus) {
      return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
    }

    const order = await transitionOrderStatus({
      orderId,
      nextStatus,
      tokenActor: {
        role: "MERCHANT_OWNER",
        merchantId: merchant.id,
        name: merchant.name,
      },
      comment:
        action === "accept"
          ? "Comercio aceptó el pedido desde su enlace de WhatsApp"
          : action === "ready"
          ? "Comercio marcó el pedido listo para recojo desde su enlace de WhatsApp"
          : "Comercio canceló el pedido desde su enlace de WhatsApp",
      cancellationReason:
        action === "cancel" ? "Cancelado por el comercio" : undefined,
    });

    // El cliente (y el repartidor, si ya estaba asignado) reciben el aviso.
    sendOrderStatusNotification(order, nextStatus).catch(() => {});

    return NextResponse.json({
      success: true,
      order: { id: order.id, status: order.status },
    });
  } catch (error: any) {
    if (error instanceof OrderAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof OrderTransitionError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[MerchantAccessAction] Error:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el pedido. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
