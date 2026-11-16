import React from "react";
import { prisma } from "@/lib/prisma";
import { CatalogoClient } from "./catalogo-client";

export const dynamic = "force-dynamic";

export default async function CatalogoPage() {
  let merchants: any[] = [];
  let products: any[] = [];
  let promotions: any[] = [];

  try {
    const [rawMerchants, rawProducts, rawPromotions] = await Promise.all([
      prisma.merchant.findMany({
        include: {
          products: true,
        },
        orderBy: { name: "asc" },
      }).catch((e) => {
        console.error("Error cargando comercios:", e);
        return [];
      }),
      prisma.product.findMany({
        include: {
          merchant: true,
        },
        orderBy: { createdAt: "desc" },
      }).catch((e) => {
        console.error("Error cargando productos:", e);
        return [];
      }),
      prisma.promotion.findMany({
        include: {
          merchant: { select: { id: true, name: true } },
        },
        orderBy: { startsAt: "desc" },
      }).catch((e) => {
        console.error("Error cargando promociones:", e);
        return [];
      }),
    ]);

    // Serialización limpia para Next.js 15 Client Components
    merchants = JSON.parse(JSON.stringify(rawMerchants));
    products = JSON.parse(JSON.stringify(rawProducts));
    promotions = JSON.parse(JSON.stringify(rawPromotions));
  } catch (err) {
    console.error("[CatalogoPage] Error crítico:", err);
  }

  return (
    <CatalogoClient
      merchants={merchants}
      products={products}
      initialPromotions={promotions}
    />
  );
}
