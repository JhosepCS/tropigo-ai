import { prisma } from "@/lib/prisma";
import { calculateRideFare, normalizeRideFareConfig } from "@/lib/rides/fare";
import { PedirClient } from "./pedir-client";

export const dynamic = "force-dynamic";

type PortalTab =
  | "inicio"
  | "delivery"
  | "mototaxi"
  | "rastreo"
  | "mercados"
  | "promos"
  | "pedidos"
  | "perfil";

function normalizeTab(value?: string): PortalTab {
  if (
    value === "delivery" ||
    value === "mototaxi" ||
    value === "rastreo" ||
    value === "mercados" ||
    value === "promos" ||
    value === "pedidos" ||
    value === "perfil"
  ) {
    return value;
  }
  return "inicio";
}

export default async function PedirPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    cat?: string;
    tab?: string;
    vehiculo?: string;
    dir?: string;
  }>;
}) {
  const params = await searchParams;

  const [merchants, zones, business] = await Promise.all([
    prisma.merchant.findMany({
      where: { isOpen: true },
      include: {
        products: {
          where: { isAvailable: true },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [{ rating: "desc" }, { name: "asc" }],
    }),
    prisma.deliveryZone.findMany({
      where: { isActive: true },
      orderBy: { baseDeliveryCost: "asc" },
    }),
    prisma.businessProfile.findFirst(),
  ]);

  const fareConfig = normalizeRideFareConfig({
    minFare: business?.rideMinFare,
    baseFare: business?.baseRideFee,
    toritoSurcharge: business?.rideToritoSurcharge,
    currencySymbol: business?.currencySymbol,
  });
  const motoFare = calculateRideFare({
    vehicleType: "MOTO",
    config: fareConfig,
  });
  const toritoFare = calculateRideFare({
    vehicleType: "TORITO",
    config: fareConfig,
  });

  return (
    <PedirClient
      merchants={merchants}
      zones={zones}
      business={business}
      initialSearch={params.q ?? ""}
      initialCategory={params.cat ?? "TODOS"}
      initialTab={normalizeTab(params.tab)}
      initialVehicle={params.vehiculo === "TORITO" ? "TORITO" : "MOTO"}
      initialAddress={params.dir ?? ""}
      rideFares={{
        MOTO: motoFare.fare,
        TORITO: toritoFare.fare,
        currency: fareConfig.currencySymbol,
      }}
    />
  );
}
