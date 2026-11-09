import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { tripId, status } = await req.json();

    if (!tripId || !status) {
      return NextResponse.json(
        { error: "tripId y status son requeridos" },
        { status: 400 }
      );
    }

    const trip = await prisma.rideTrip.update({
      where: { id: tripId },
      data: { status },
      include: { assignedRider: true, customer: true },
    });

    // Si finalizó la carrera, liberar al conductor
    if (status === "FINALIZADO" && trip.assignedRiderId) {
      await prisma.rider.update({
        where: { id: trip.assignedRiderId },
        data: {
          isAvailable: true,
          earnedBalance: { increment: trip.fareAmount },
        },
      });
    }

    return NextResponse.json({ success: true, trip });
  } catch (error: any) {
    console.error("Error al actualizar carrera:", error);
    return NextResponse.json(
      { error: "Error al actualizar estado de carrera" },
      { status: 500 }
    );
  }
}
