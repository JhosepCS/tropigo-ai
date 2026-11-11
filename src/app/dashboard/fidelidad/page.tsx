import { prisma } from "@/lib/prisma";
import {
  buildLoyaltyQrDataUrl,
  ensureLoyaltyCode,
  getLoyaltySettings,
  getLoyaltySummary,
} from "@/lib/loyalty/service";
import { FidelidadClient } from "./fidelidad-client";

export const dynamic = "force-dynamic";

export default async function FidelidadPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; customer?: string }>;
}) {
  const params = await searchParams;
  const search = String(params.search || "").trim();
  const selectedId = String(params.customer || "").trim();

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { phone: { contains: search } },
          { loyaltyCode: { contains: search.toUpperCase() } },
        ],
      }
    : {};

  const [settings, business, rawCustomers] = await Promise.all([
    getLoyaltySettings(),
    prisma.businessProfile.findFirst({
      select: { name: true, phone: true, address: true },
    }),
    prisma.customer.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        loyaltyCode: true,
        loyaltyStamps: true,
        loyaltyTotalEarned: true,
        loyaltyRewardsRedeemed: true,
        updatedAt: true,
        _count: { select: { orders: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);

  // Los clientes existentes reciben su código de QR la primera vez que se
  // abren en el panel; los nuevos lo reciben al cotizar o al sellar.
  const customers = await Promise.all(
    rawCustomers.map(async (customer) => ({
      ...customer,
      loyaltyCode:
        customer.loyaltyCode || (await ensureLoyaltyCode(customer.id)),
      rewardAvailable:
        settings.enabled &&
        customer.loyaltyStamps >= settings.stampsNeeded,
    }))
  );

  const selectedCustomer =
    customers.find((customer) => customer.id === selectedId) ||
    customers[0] ||
    null;

  let selectedCard = null;
  if (selectedCustomer) {
    const summary = await getLoyaltySummary(selectedCustomer.id);
    selectedCard = {
      ...summary,
      phone: selectedCustomer.phone,
      totalOrders: selectedCustomer._count.orders,
      qrDataUrl: await buildLoyaltyQrDataUrl(summary.code),
    };
  }

  return (
    <FidelidadClient
      customers={customers.map((customer) => ({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        loyaltyCode: customer.loyaltyCode,
        loyaltyStamps: customer.loyaltyStamps,
        loyaltyTotalEarned: customer.loyaltyTotalEarned,
        loyaltyRewardsRedeemed: customer.loyaltyRewardsRedeemed,
        totalOrders: customer._count.orders,
        rewardAvailable: customer.rewardAvailable,
      }))}
      selectedCard={selectedCard}
      settings={{
        enabled: settings.enabled,
        stampsRequired: settings.stampsRequired,
        stampsNeeded: settings.stampsNeeded,
        rewardDescription: settings.rewardDescription,
        businessName: business?.name || settings.businessName,
        businessPhone: business?.phone || "",
        businessAddress: business?.address || "",
      }}
      search={search}
    />
  );
}
