import React from "react";
import { prisma } from "@/lib/prisma";
import { PublicClient } from "./pedir-client";

export const dynamic = "force-dynamic";

export default async function PedirPage() {
  const [merchantsRaw, zonesRaw, businessRaw] = await Promise.all([
    prisma.merchant.findMany({
      where: { isOpen: true },
      include: {
        products: {
          where: { isAvailable: true },
        },
      },
      orderBy: { rating: "desc" },
    }).catch(() => []),
    prisma.deliveryZone.findMany({
      where: { isActive: true },
      orderBy: { baseDeliveryCost: "asc" },
    }).catch(() => []),
    prisma.businessProfile.findFirst().catch(() => null),
  ]);

  const merchants = JSON.parse(JSON.stringify(merchantsRaw));
  const zones = JSON.parse(JSON.stringify(zonesRaw));
  const business = JSON.parse(JSON.stringify(businessRaw || {}));

  return (
    <PublicClient
      merchants={merchants}
      zones={zones}
      business={business}
    />
  );
}
