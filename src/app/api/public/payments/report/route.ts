import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentMethodById } from "@/lib/payments/service";
import { isCashMethod, paymentMethodCode } from "@/lib/payments/types";
import {
  parseRiderPaymentQr,
  RiderPaymentQr,
  RIDER_QR_METHOD_ID,
  walletToPaymentCode,
} from "@/lib/payments/rider";

export const dynamic = "force-dynamic";

const recentReports = new Map<string, number>();
const REPORT_COOLDOWN_MS = 60_000;

function cleanReference(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 160);
}

/**
 * POST /api/public/payments/report
 * El cliente reporta que realizó un pago (QR, billetera o transferencia).
 * No confirma el pago: queda PENDIENTE para que un operador lo verifique.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : "";
    const tripId = typeof body?.tripId === "string" ? body.tripId.trim() : "";
    const methodId = typeof body?.methodId === "string" ? body.methodId.trim() : "";
    const reference = cleanReference(body?.reference);

    if ((!orderId && !tripId) || (orderId && tripId)) {
      return NextResponse.json(
        { error: "Debes indicar un pedido o una carrera, pero no ambos." },
        { status: 400 }
      );
    }
    if (!methodId) {
      return NextResponse.json(
        { error: "Selecciona el método de pago que usaste." },
        { status: 400 }
      );
    }

    const isRiderQr = methodId === RIDER_QR_METHOD_ID;
    let riderQr: RiderPaymentQr | null = null;
    let method: {
      id: string;
      label: string;
      type: "CASH" | "QR" | "WALLET" | "BANK";
      accountName: string;
      accountNumber: string;
      instructions: string;
    } | null = null;

    if (isRiderQr) {
      if (!orderId) {
        return NextResponse.json(
          { error: "El QR del repartidor solo aplica a pedidos." },
          { status: 400 }
        );
      }
      const orderWithRider = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          assignedRider: { select: { name: true, paymentQrJson: true } },
        },
      });
      riderQr = parseRiderPaymentQr(orderWithRider?.assignedRider?.paymentQrJson);
      if (!riderQr) {
        return NextResponse.json(
          { error: "El repartidor todavía no cargó su QR de cobro." },
          { status: 400 }
        );
      }
      method = {
        id: RIDER_QR_METHOD_ID,
        label: riderQr.label || "QR del repartidor",
        type: riderQr.type,
        accountName: riderQr.accountName,
        accountNumber: riderQr.accountNumber,
        instructions: riderQr.instructions,
      };
    } else {
      const storedMethod = await getPaymentMethodById(methodId);
      if (!storedMethod || !storedMethod.enabled) {
        return NextResponse.json(
          { error: "El método de pago ya no está disponible." },
          { status: 400 }
        );
      }
      method = storedMethod;
    }

    if (!method) {
      return NextResponse.json(
        { error: "Método de pago no disponible." },
        { status: 400 }
      );
    }

    const methodCode = isRiderQr
      ? walletToPaymentCode(riderQr?.label)
      : paymentMethodCode(method);
    const methodProvider = isRiderQr
      ? walletToPaymentCode(riderQr?.label)
      : isCashMethod(method)
      ? "EFECTIVO"
      : method.type;

    const reportKey = `${orderId || tripId}:${method.id}`;
    const lastReport = recentReports.get(reportKey) || 0;
    if (Date.now() - lastReport < REPORT_COOLDOWN_MS) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        message: "Tu pago ya fue reportado. Un operador lo verificará en breve.",
      });
    }

    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          orderNumber: true,
          totalAmount: true,
          paymentStatus: true,
          status: true,
        },
      });

      if (!order) {
        return NextResponse.json(
          { error: "No encontramos el pedido." },
          { status: 404 }
        );
      }
      if (order.status === "CANCELADO") {
        return NextResponse.json(
          { error: "Este pedido fue cancelado." },
          { status: 400 }
        );
      }
      if (order.paymentStatus === "PAGADO_VERIFICADO") {
        return NextResponse.json({
          success: true,
          alreadyPaid: true,
          message: "Este pedido ya figura como pagado y verificado.",
        });
      }

      await prisma.$transaction([
        prisma.paymentRecord.create({
          data: {
            orderId: order.id,
            amount: order.totalAmount,
            provider: methodProvider,
            methodId: method.id,
            reference: reference || null,
            reportedByCustomer: true,
            verificationStatus: "PENDIENTE",
          },
        }),
        prisma.order.update({
          where: { id: order.id },
          data: {
            paymentMethod: methodCode,
            paymentStatus: "PENDIENTE",
          },
        }),
        prisma.activityLog.create({
          data: {
            action: "PAYMENT_REPORTED_BY_CUSTOMER",
            entityName: "Order",
            entityId: order.id,
            provider: "tropigo_payments",
            channel: "public",
            status: "success",
            detailsJson: JSON.stringify({
              orderNumber: order.orderNumber,
              methodId: method.id,
              methodLabel: method.label,
              reference: reference || null,
              amount: order.totalAmount,
            }),
          },
        }),
      ]);

      recentReports.set(reportKey, Date.now());
      return NextResponse.json({
        success: true,
        message:
          "Pago reportado. Un operador de TropiGO verificará la transacción y actualizará tu pedido.",
      });
    }

    const trip = await prisma.rideTrip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        tripNumber: true,
        fareAmount: true,
        paymentStatus: true,
        status: true,
      },
    });

    if (!trip) {
      return NextResponse.json(
        { error: "No encontramos la carrera." },
        { status: 404 }
      );
    }
    if (trip.status === "CANCELADO") {
      return NextResponse.json(
        { error: "Esta carrera fue cancelada." },
        { status: 400 }
      );
    }
    if (trip.paymentStatus === "PAGADO_VERIFICADO") {
      return NextResponse.json({
        success: true,
        alreadyPaid: true,
        message: "Esta carrera ya figura como pagada y verificada.",
      });
    }

    await prisma.$transaction([
      prisma.paymentRecord.create({
        data: {
          rideTripId: trip.id,
          amount: trip.fareAmount,
          provider: methodProvider,
          methodId: method.id,
          reference: reference || null,
          reportedByCustomer: true,
          verificationStatus: "PENDIENTE",
        },
      }),
      prisma.rideTrip.update({
        where: { id: trip.id },
        data: {
          paymentMethod: methodCode,
          paymentStatus: "PENDIENTE",
        },
      }),
      prisma.activityLog.create({
        data: {
          action: "PAYMENT_REPORTED_BY_CUSTOMER",
          entityName: "RideTrip",
          entityId: trip.id,
          provider: "tropigo_payments",
          channel: "public",
          status: "success",
          detailsJson: JSON.stringify({
            tripNumber: trip.tripNumber,
            methodId: method.id,
            methodLabel: method.label,
            reference: reference || null,
            amount: trip.fareAmount,
          }),
        },
      }),
    ]);

    recentReports.set(reportKey, Date.now());
    return NextResponse.json({
      success: true,
      message:
        "Pago reportado. Un operador de TropiGO verificará la transacción y actualizará tu carrera.",
    });
  } catch (error: any) {
    console.error("[PaymentReport] Error:", error);
    return NextResponse.json(
      { error: "No se pudo registrar el reporte de pago." },
      { status: 500 }
    );
  }
}
