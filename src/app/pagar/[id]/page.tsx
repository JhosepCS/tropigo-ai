import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEnabledPaymentMethods } from "@/lib/payments/service";
import type { PublicPaymentMethod } from "@/lib/payments/types";
import { PaymentClient } from "./payment-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pago de pedido · TropiGO",
  description: "Paga tu pedido o carrera de TropiGO con QR, billetera digital o efectivo.",
};

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      orderNumber: true,
      totalAmount: true,
      paymentMethod: true,
      paymentStatus: true,
      status: true,
      merchant: { select: { name: true } },
    },
  });

  const trip = order
    ? null
    : await prisma.rideTrip.findUnique({
        where: { id },
        select: {
          id: true,
          tripNumber: true,
          fareAmount: true,
          paymentMethod: true,
          paymentStatus: true,
          status: true,
          destinationAddress: true,
        },
      });

  if (!order && !trip) notFound();

  const methods = await getEnabledPaymentMethods();
  const publicMethods: PublicPaymentMethod[] = methods.map((method) => ({
    id: method.id,
    label: method.label,
    type: method.type,
    emoji: method.emoji,
    accountName: method.accountName,
    accountNumber: method.accountNumber,
    instructions: method.instructions,
    hasQr: Boolean(method.qrImage),
    qrUrl: method.qrImage
      ? `/api/public/payment-qr/${encodeURIComponent(method.id)}`
      : null,
  }));

  const payment = order
    ? {
        id: order.id,
        kind: "ORDER" as const,
        code: order.orderNumber,
        amount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        status: order.status,
        subtitle:
          order.merchant?.name?.replace(/^\[DEMO\]\s*/i, "") || "Pedido TropiGO",
      }
    : {
        id: trip!.id,
        kind: "RIDE" as const,
        code: trip!.tripNumber,
        amount: trip!.fareAmount,
        paymentMethod: trip!.paymentMethod,
        paymentStatus: trip!.paymentStatus,
        status: trip!.status,
        subtitle: trip!.destinationAddress,
      };

  return <PaymentClient payment={payment} methods={publicMethods} />;
}
