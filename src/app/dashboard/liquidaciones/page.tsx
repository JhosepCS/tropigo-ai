import React from "react";
import { prisma } from "@/lib/prisma";
import { getFleetLiveAudit } from "@/lib/settlements/service";
import { LiquidacionesClient } from "./liquidaciones-client";

export const dynamic = "force-dynamic";

export default async function LiquidacionesPage() {
  const [fleetSummary, rawSettlements, riders] = await Promise.all([
    getFleetLiveAudit().catch(() => ({
      periodLabel: "Hoy",
      totalServicesCount: 0,
      totalOrdersCount: 0,
      totalRidesCount: 0,
      totalGrossEarnedByRiders: 0,
      totalCashCollectedInHand: 0,
      totalRestaurantSubtotals: 0,
      totalCentralOwedToRiders: 0,
      totalRidersOwedToCentral: 0,
      ridersAudits: [],
    })),
    prisma.riderSettlement
      .findMany({
        include: {
          rider: {
            select: {
              id: true,
              name: true,
              phone: true,
              vehicleType: true,
              plateNumber: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      })
      .catch(() => []),
    prisma.rider
      .findMany({
        where: {
          OR: [{ isActive: true }, { status: "ACTIVO" }],
        },
        select: {
          id: true,
          name: true,
          phone: true,
          vehicleType: true,
          plateNumber: true,
        },
        orderBy: { name: "asc" },
      })
      .catch(() => []),
  ]);

  const serializedSettlements = rawSettlements.map((s) => ({
    ...s,
    periodStart: s.periodStart.toISOString(),
    periodEnd: s.periodEnd.toISOString(),
    paidAt: s.paidAt ? s.paidAt.toISOString() : null,
    createdAt: s.createdAt.toISOString(),
  }));

  return (
    <LiquidacionesClient
      initialFleetAudit={fleetSummary}
      initialSettlements={serializedSettlements}
      riders={riders}
    />
  );
}
