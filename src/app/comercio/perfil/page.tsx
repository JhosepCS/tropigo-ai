import React from "react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/rbac";
import { redirect } from "next/navigation";
import { MerchantProfileClient } from "./merchant-profile-client";
import { EmptyState } from "@/components/ui/empty-state";
import { Store } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MerchantProfilePage() {
  const session = await requireRole(["MERCHANT_OWNER", "ADMIN", "SUPERADMIN"]);

  let merchant = null;
  if (session.role === "MERCHANT_OWNER") {
    merchant = await prisma.merchant.findFirst({
      where: { ownerId: session.userId },
      include: {
        city: true,
        commercialCategory: true,
        branches: { orderBy: { createdAt: "asc" } },
        schedules: { orderBy: { dayOfWeek: "asc" } },
      },
    });
  } else {
    // Para administradores que visitan la vista
    merchant = await prisma.merchant.findFirst({
      where: { isOpen: true },
      include: {
        city: true,
        commercialCategory: true,
        branches: { orderBy: { createdAt: "asc" } },
        schedules: { orderBy: { dayOfWeek: "asc" } },
      },
    });
  }

  if (!merchant) {
    return (
      <EmptyState
        icon={<Store className="w-8 h-8 text-slate-400" />}
        title="Sin comercio vinculado"
        description="No encontramos un comercio afiliado asignado a tu cuenta."
      />
    );
  }

  // Calcular estadísticas reales del comercio
  const completedOrders = await prisma.order.findMany({
    where: { merchantId: merchant.id, status: "ENTREGADO" },
    select: { totalAmount: true },
  });

  const totalRevenueBs = completedOrders.reduce((acc, o) => acc + o.totalAmount, 0);

  const stats = {
    completedOrders: completedOrders.length,
    totalRevenueBs: Number(totalRevenueBs.toFixed(2)),
  };

  return (
    <MerchantProfileClient
      initialMerchant={merchant}
      initialStats={stats}
    />
  );
}
