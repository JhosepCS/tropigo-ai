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

    const rider = await prisma.rider.findUnique({
      where: { id: riderId },
      select: { id: true, isActive: true, status: true },
    });
    if (!rider) {
      return NextResponse.json(
        { error: "Conductor no encontrado." },
        { status: 404 }
      );
    }
    if (!rider.isActive || rider.status !== "ACTIVO") {
      return NextResponse.json(
        {
          error:
            "El conductor está apagado o no aprobado. Enciéndelo desde el CRM antes de asignarle una carrera.",
        },
        { status: 409 }
      );
    }

    const [trip, riderUpdated] = await Promise.all([
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
        action: `Conductor ${riderUpdated.name} asignado a carrera ${trip.tripNumber}`,
        provider: "mototaxi_dispatch",
        channel: "system",
        status: "success",
        detailsJson: JSON.stringify({
          tripNumber: trip.tripNumber,
          conductor: riderUpdated.name,
          vehiculo: riderUpdated.vehicleType,
        }),
      },
    });

    return NextResponse.json({ success: true, trip, rider: riderUpdated });
  } catch (error: any) {
    console.error("Error al asignar conductor:", error);
    return NextResponse.json(
      { error: "Error al asignar conductor" },
      { status: 500 }
    );
  }
}
