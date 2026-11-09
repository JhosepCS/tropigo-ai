import React from "react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { RiderRidesClient } from "./rider-rides-client";
import { EmptyState } from "@/components/ui/empty-state";
import { Navigation } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RiderCarrerasPage() {
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
        icon={<Navigation className="w-8 h-8 text-slate-400" />}
        title="Sin perfil de conductor activo"
        description="Tu cuenta no está vinculada a un registro de mototaxi o torito en Ivirgarzama."
      />
    );
  }

  // Consultar estrictamente las carreras asignadas a este conductor o solicitudes pendientes
  const activeRides = await prisma.rideTrip.findMany({
    where: {
      OR: [
        { assignedRiderId: rider.id, status: { in: ["CONDUCTOR_ASIGNADO", "EN_CURSO"] } },
        { status: "SOLICITADO", assignedRiderId: null },
      ],
    },
    include: {
      customer: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const completedRides = await prisma.rideTrip.findMany({
    where: {
      assignedRiderId: rider.id,
      status: "FINALIZADO",
    },
    include: {
      customer: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  return (
    <RiderRidesClient
      initialRides={activeRides}
      completedRides={completedRides}
      riderId={rider.id}
    />
  );
}
