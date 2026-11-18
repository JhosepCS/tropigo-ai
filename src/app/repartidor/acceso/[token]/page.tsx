import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RiderAccessClient } from "./rider-access-client";
import { AlertTriangle, Clock3, MessageCircle, Power, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mi panel de repartidor · TropiGO",
  description: "Tus carreras asignadas, botones de avance y mapa de entrega.",
};

function supportUrl() {
  return "https://wa.me/59157770679";
}

export default async function RiderAccessPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const rider = await prisma.rider.findUnique({
    where: { accessToken: token },
    include: { city: { select: { name: true } } },
  });

  if (!rider) {
    return (
      <AccessShell title="Enlace no válido">
        <div className="rounded-3xl border border-[#E0CCE9] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-xl font-black text-[#1E1523]">
            Este enlace ya no está activo
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#6B5A72]">
            Puede que TropiGO haya regenerado tu acceso por seguridad. Pide tu
            enlace nuevo por WhatsApp y lo recibirás al instante.
          </p>
          <a
            href={supportUrl()}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#331E39] px-5 py-3 text-sm font-bold text-white"
          >
            <MessageCircle className="h-4 w-4" />
            Pedir mi enlace
          </a>
        </div>
      </AccessShell>
    );
  }

  if (rider.status !== "ACTIVO" || !rider.isActive) {
    const paused = rider.status === "ACTIVO" && !rider.isActive;
    const rejected = rider.status === "RECHAZADO" || rider.status === "SUSPENDIDO";
    return (
      <AccessShell title={paused ? "Cuenta en pausa" : "Registro en revisión"}>
        <div className="rounded-3xl border border-[#E0CCE9] bg-white p-8 text-center shadow-sm">
          <div
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
              paused
                ? "bg-slate-100 text-slate-600"
                : rejected
                ? "bg-red-50 text-red-600"
                : "bg-amber-50 text-amber-600"
            }`}
          >
            {paused ? (
              <Power className="h-7 w-7" />
            ) : rejected ? (
              <AlertTriangle className="h-7 w-7" />
            ) : (
              <Clock3 className="h-7 w-7" />
            )}
          </div>
          <h1 className="mt-4 text-xl font-black text-[#1E1523]">
            {paused
              ? `Hola ${rider.name.split(" ")[0]}, tu cuenta está en pausa`
              : rejected
              ? "Tu registro no está activo"
              : `Hola ${rider.name.split(" ")[0]}, estamos revisando tu registro`}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#6B5A72]">
            {paused
              ? "La central de TropiGO te desconectó por ahora. Cuando te vuelvan a encender, este mismo enlace funcionará y recibirás carreras por WhatsApp."
              : rejected
              ? "Un operador de TropiGO revisará tu caso. Escríbenos por WhatsApp para conocer el motivo o volver a postularte."
              : "Un operador de TropiGO validará tus datos y tu vehículo. Apenas esté aprobado, este mismo enlace se activará y te llegarán las carreras por WhatsApp."}
          </p>
          <a
            href={supportUrl()}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#331E39] px-5 py-3 text-sm font-bold text-white"
          >
            <MessageCircle className="h-4 w-4" />
            Hablar con TropiGO
          </a>
        </div>
      </AccessShell>
    );
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [activeOrders, completedToday] = await Promise.all([
    prisma.order.findMany({
      where: {
        assignedRiderId: rider.id,
        status: { in: ["ASIGNADO", "EN_CAMINO"] },
      },
      include: {
        customer: { select: { name: true, phone: true } },
        merchant: { select: { name: true, address: true, phone: true } },
        items: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.order.findMany({
      where: {
        assignedRiderId: rider.id,
        status: "ENTREGADO",
        updatedAt: { gte: startOfDay },
      },
      select: {
        id: true,
        orderNumber: true,
        deliveryFee: true,
        deliveryAddressText: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <AccessShell title="Mi panel de repartidor">
      <RiderAccessClient
        token={token}
        rider={{
          id: rider.id,
          name: rider.name,
          vehicleType: rider.vehicleType,
          plateNumber: rider.plateNumber,
          cityName: rider.city?.name || "Ivirgarzama",
        }}
        initialOrders={activeOrders.map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          deliveryAddressText: order.deliveryAddressText,
          referencePoint: order.referencePoint,
          totalAmount: order.totalAmount,
          deliveryFee: order.deliveryFee,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          riderAcceptedAt: order.riderAcceptedAt?.toISOString() || null,
          riderArrivedAt: order.riderArrivedAt?.toISOString() || null,
          customerName: order.customer?.name || "Cliente",
          customerPhone: order.customer?.phone || null,
          merchantName: order.merchant?.name || "Comercio",
          merchantAddress: order.merchant?.address || null,
          merchantPhone: order.merchant?.phone || null,
          items: order.items.map((item) => ({
            name: item.productName,
            quantity: item.quantity,
          })),
        }))}
        completedToday={completedToday.map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          deliveryFee: order.deliveryFee,
          deliveryAddressText: order.deliveryAddressText,
          deliveredAt: order.updatedAt.toISOString(),
        }))}
      />
    </AccessShell>
  );
}

function AccessShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
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
            Acceso seguro
          </span>
        </div>
      </header>
      <div className="mx-auto max-w-2xl px-4 pt-5">
        <h1 className="sr-only">{title}</h1>
        {children}
      </div>
    </main>
  );
}
