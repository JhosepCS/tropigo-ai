import { prisma } from "@/lib/prisma";
import { RidesClient } from "./rides-client";

export const dynamic = "force-dynamic";

export default async function MovilidadPage() {
  const [trips, drivers, business] = await Promise.all([
    prisma.rideTrip.findMany({
      include: {
        customer: true,
        assignedRider: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.rider.findMany({
      where: { isActive: true },
      orderBy: { isAvailable: "desc" },
    }),
    prisma.businessProfile.findFirst(),
  ]);

  return <RidesClient initialTrips={trips} drivers={drivers} business={business} />;
}
