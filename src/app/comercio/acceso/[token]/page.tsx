import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { MerchantAccessClient } from "./merchant-access-client";
import { AlertTriangle, MessageCircle, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mi cocina · TropiGO",
  description: "Pedidos entrantes y botones para avanzar la cocina.",
};

export default async function MerchantAccessPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const merchant = await prisma.merchant.findUnique({
    where: { accessToken: token },
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      isOpen: true,
      city: { select: { name: true } },
    },
  });

  if (!merchant) {
    return (
      <Shell>
        <div className="rounded-3xl border border-[#E0CCE9] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-xl font-black text-[#1E1523]">
            Este enlace ya no está activo
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#6B5A72]">
            Pide a TropiGO un enlace nuevo para tu cocina. Se genera al instante
            desde el CRM y llega por WhatsApp.
          </p>
          <a
            href="https://wa.me/59157770679"
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#331E39] px-5 py-3 text-sm font-bold text-white"
          >
            <MessageCircle className="h-4 w-4" />
            Pedir mi enlace
          </a>
        </div>
      </Shell>
    );
  }

  const orders = await prisma.order.findMany({
    where: {
      merchantId: merchant.id,
      status: { in: ["RECIBIDO", "EN_PREPARACION", "LISTO_RECOJO", "ASIGNADO", "EN_CAMINO"] },
    },
    include: {
      customer: { select: { name: true, phone: true } },
      assignedRider: { select: { name: true, phone: true } },
      items: true,
    },
    orderBy: { createdAt: "asc" },
    take: 40,
  });

  return (
    <Shell>
      <MerchantAccessClient
        token={token}
        merchant={{
          id: merchant.id,
          name: merchant.name.replace(/^\[DEMO\]\s*/i, ""),
          address: merchant.address,
          phone: merchant.phone,
          isOpen: merchant.isOpen,
          cityName: merchant.city?.name || "Ivirgarzama",
        }}
        initialOrders={orders.map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          createdAt: order.createdAt.toISOString(),
          totalAmount: order.totalAmount,
          deliveryFee: order.deliveryFee,
          paymentMethod: order.paymentMethod,
          deliveryAddressText: order.deliveryAddressText,
          referencePoint: order.referencePoint,
          customerNotes: order.customerNotes || order.notes || null,
          customerName: order.customer?.name || "Cliente",
          customerPhone: order.customer?.phone || null,
          riderName: order.assignedRider?.name?.replace(/^\[DEMO\]\s*/i, "") || null,
          items: order.items.map((item) => ({
            name: item.productName,
            quantity: item.quantity,
            variantName: item.variantName,
            subtotal: item.subtotal,
            specialInstructions: item.specialInstructions,
          })),
        }))}
      />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#F7F4F9] pb-10 text-[#1E1523]">
      <header className="bg-[#331E39] text-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-sm font-black">
              TG
            </span>
            <span className="text-sm font-black tracking-tight">TropiGO</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#E6D2F0]">
            <ShieldCheck className="h-3 w-3" />
            Cocina
          </span>
        </div>
      </header>
      <div className="mx-auto max-w-2xl px-4 pt-5">{children}</div>
    </main>
  );
}
