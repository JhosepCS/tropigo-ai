import React from "react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/rbac";
import { notFound } from "next/navigation";
import { MerchantDetailClient } from "./merchant-detail-client";

export const dynamic = "force-dynamic";

export default async function MerchantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["SUPERADMIN", "ADMIN"]);
  const { id } = await params;

  const [merchant, categories, cities] = await Promise.all([
    prisma.merchant.findUnique({
      where: { id },
      include: {
        city: true,
        commercialCategory: true,
        owner: { select: { id: true, name: true, email: true, phone: true } },
        branches: { orderBy: { createdAt: "asc" } },
        schedules: { orderBy: { dayOfWeek: "asc" } },
        products: { orderBy: { createdAt: "desc" }, take: 20 },
        orders: {
          orderBy: { createdAt: "desc" },
          take: 15,
          include: {
            customer: { select: { id: true, name: true, phone: true } },
            assignedRider: { select: { id: true, name: true } },
            items: true,
          },
        },
      },
    }),
    prisma.commercialCategory.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    }),
    prisma.city.findMany({
      orderBy: { isActive: "desc" },
    }),
  ]);

  if (!merchant) {
    notFound();
  }

  // Calcular métricas reales
  const allOrders = await prisma.order.findMany({
    where: { merchantId: id },
    select: { totalAmount: true, status: true },
  });

  const totalOrdersCount = allOrders.length;
  const completedOrders = allOrders.filter((o) => o.status === "ENTREGADO");
  const totalRevenueBs = completedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const commissionGeneratedBs = totalRevenueBs * merchant.commissionRate;
  const averageTicketBs = completedOrders.length > 0 ? totalRevenueBs / completedOrders.length : 0;

  const stats = {
    totalOrders: totalOrdersCount,
    completedOrdersCount: completedOrders.length,
    totalRevenueBs: Number(totalRevenueBs.toFixed(2)),
    commissionGeneratedBs: Number(commissionGeneratedBs.toFixed(2)),
    averageTicketBs: Number(averageTicketBs.toFixed(2)),
    rating: merchant.rating,
  };

  return (
    <MerchantDetailClient
      initialMerchant={merchant}
      initialStats={stats}
      categories={categories}
      cities={cities}
    />
  );
}
