import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { tripId, riderId } = await req.json();

    if (!tripId || !riderId) {
      return NextResponse.json(
        { error: "tripId y riderId son requeridos" },
        { status: 400 }
      );
    }

    const [trip, rider] = await Promise.all([
      prisma.rideTrip.update({
        where: { id: tripId },
        data: {
          assignedRiderId: riderId,
          status: "CONDUCTOR_ASIGNADO",
        },
        include: { customer: true, assignedRider: true },
      }),
      prisma.rider.update({
        where: { id: riderId },
        data: {
          isAvailable: false,
          totalRides: { increment: 1 },
        },
      }),
    ]);

    await prisma.activityLog.create({
      data: {
        action: `Conductor ${rider.name} asignado a carrera ${trip.tripNumber}`,
        provider: "mototaxi_dispatch",
        channel: "system",
        status: "success",
        detailsJson: JSON.stringify({
          tripNumber: trip.tripNumber,
          conductor: rider.name,
          vehiculo: rider.vehicleType,
        }),
      },
    });

    return NextResponse.json({ success: true, trip, rider });
  } catch (error: any) {
    console.error("Error al asignar conductor:", error);
    return NextResponse.json(
      { error: "Error al asignar conductor" },
      { status: 500 }
    );
  }
}
