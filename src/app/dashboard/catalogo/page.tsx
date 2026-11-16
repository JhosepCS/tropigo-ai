import React from "react";
import { prisma } from "@/lib/prisma";
import { CatalogoClient } from "./catalogo-client";

export const dynamic = "force-dynamic";

export default async function CatalogoPage() {
  const [merchants, products, promotions] = await Promise.all([
    prisma.merchant.findMany({
      include: {
        products: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      include: {
        merchant: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.promotion.findMany({
      include: {
        merchant: { select: { id: true, name: true } },
      },
      orderBy: { startsAt: "desc" },
    }),
  ]);

  return (
    <CatalogoClient
      merchants={merchants}
      products={products}
      initialPromotions={promotions}
    />
  );
}
