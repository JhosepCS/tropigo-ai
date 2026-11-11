import React from "react";
import { prisma } from "@/lib/prisma";
import { ZonasClient } from "./zonas-client";

export const dynamic = "force-dynamic";

export default async function ZonasPage() {
  const [cities, zones, business] = await Promise.all([
    prisma.city.findMany({
      orderBy: { isActive: "desc" },
    }),
    prisma.deliveryZone.findMany({
      where: { isActive: true },
      orderBy: { baseDeliveryCost: "asc" },
    }),
    prisma.businessProfile.findFirst({
      select: { rideMinFare: true },
    }),
  ]);

  return (
    <ZonasClient
      cities={cities}
      zones={zones}
      minRideFare={Math.max(10, Number(business?.rideMinFare) || 10)}
    />
  );
}
