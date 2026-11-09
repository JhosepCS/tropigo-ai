import React from "react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { MerchantMenuClient } from "./merchant-menu-client";
import { EmptyState } from "@/components/ui/empty-state";
import { Store } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ComercioMenuPage() {
  const session = await getSession();

  let merchant = null;
  if (session?.role === "MERCHANT_OWNER") {
    merchant = await prisma.merchant.findFirst({
      where: { ownerId: session.userId },
      include: {
        products: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }

  if (!merchant) {
    merchant = await prisma.merchant.findFirst({
      where: { isOpen: true },
      include: {
        products: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }

  if (!merchant) {
    return (
      <EmptyState
        icon={<Store className="w-8 h-8 text-slate-400" />}
        title="Sin comercio vinculado"
        description="No se encontró ningún restaurante o tienda asociado a tu cuenta."
      />
    );
  }

  return (
    <MerchantMenuClient
      initialProducts={merchant.products || []}
      merchantName={merchant.name}
    />
  );
}
