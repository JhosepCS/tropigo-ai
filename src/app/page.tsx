import { prisma } from "@/lib/prisma";
import { PublicClient } from "./public-client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [merchants, zones, business] = await Promise.all([
    prisma.merchant.findMany({
      where: { isOpen: true },
      include: {
        products: {
          where: { isAvailable: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.deliveryZone.findMany({
      where: { isActive: true },
      orderBy: { baseDeliveryCost: "asc" },
    }),
    prisma.businessProfile.findFirst(),
  ]);

  return (
    <PublicClient
      merchants={merchants}
      zones={zones}
      business={business}
    />
  );
}
