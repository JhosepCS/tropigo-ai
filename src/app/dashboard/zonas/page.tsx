import React from "react";
import { prisma } from "@/lib/prisma";
import { ZonasClient } from "./zonas-client";

export const dynamic = "force-dynamic";

export default async function ZonasPage() {
  const [cities, zones] = await Promise.all([
    prisma.city.findMany({
      orderBy: { isActive: "desc" },
    }),
    prisma.deliveryZone.findMany({
      where: { isActive: true },
      orderBy: { baseDeliveryCost: "asc" },
    }),
  ]);

  return <ZonasClient cities={cities} zones={zones} />;
}
