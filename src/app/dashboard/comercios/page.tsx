import React from "react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/rbac";
import { ComerciosClient } from "./comercios-client";

export const dynamic = "force-dynamic";

export default async function ComerciosPage() {
  await requireRole(["SUPERADMIN", "ADMIN"]);

  const [merchants, categories, cities, total] = await Promise.all([
    prisma.merchant.findMany({
      include: {
        city: true,
        commercialCategory: true,
        _count: {
          select: {
            products: true,
            orders: true,
            branches: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.commercialCategory.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    }),
    prisma.city.findMany({
      orderBy: { isActive: "desc" },
    }),
    prisma.merchant.count(),
  ]);

  return (
    <ComerciosClient
      initialMerchants={merchants}
      categories={categories}
      cities={cities}
      initialPagination={{
        page: 1,
        total,
        totalPages: Math.ceil(total / 12),
      }}
    />
  );
}
