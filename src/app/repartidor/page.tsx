import React from "react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { RiderOrdersClient } from "./rider-orders-client";
import { EmptyState } from "@/components/ui/empty-state";
import { Bike } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RepartidorPage() {
  const session = await getSession();

  let rider = null;
  if (session?.userId) {
    rider = await prisma.rider.findFirst({
      where: {
        OR: [
          { userId: session.userId },
          { id: session.riderId },
        ],
      },
    });
  }

  if (!rider && ["SUPERADMIN", "ADMIN", "OPERATOR"].includes(session?.role || "")) {
    rider = await prisma.rider.findFirst({ where: { isActive: true } });
  }

  if (!rider) {
    return (
      <EmptyState
        icon={<Bike className="w-8 h-8 text-slate-400" />}
        title="Sin perfil de repartidor activo"
        description="Tu cuenta no está vinculada a un registro de repartidor o mototaxista en Ivirgarzama."
      />
    );
  }

  // Consultar estrictamente los pedidos asignados a este repartidor o disponibles para recojo
  const activeOrders = await prisma.order.findMany({
    where: {
      OR: [
        { assignedRiderId: rider.id, status: { in: ["ASIGNADO", "EN_CAMINO"] } },
        { status: "LISTO_RECOJO", assignedRiderId: null },
      ],
    },
    include: {
      customer: true,
      merchant: true,
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const completedOrders = await prisma.order.findMany({
    where: {
      assignedRiderId: rider.id,
      status: "ENTREGADO",
    },
    include: {
      customer: true,
      merchant: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  return (
    <RiderOrdersClient
      initialOrders={activeOrders}
      completedOrders={completedOrders}
      riderId={rider.id}
    />
  );
}
