import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertRiderTripAccess, UnauthorizedError, ForbiddenError } from "@/lib/auth/rbac";
import { awardLoyaltyOnRideCompletionById } from "@/lib/loyalty/service";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { rideId, status } = await req.json();

    if (!rideId || !status) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
    }

    // Validación estricta en servidor: solo el mototaxista asignado o administradores/operadores pueden actualizar la carrera
    await assertRiderTripAccess(session.userId, rideId);

    const userWithRider = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { riderProfile: true },
    });

    const updateData: any = { status };
    if (userWithRider?.riderProfile) {
      updateData.assignedRiderId = userWithRider.riderProfile.id;
    }

    const ride = await prisma.rideTrip.update({
      where: { id: rideId },
      data: updateData,
    });

    if (status === "FINALIZADO") {
      try {
        await awardLoyaltyOnRideCompletionById(ride.id);
      } catch (loyaltyError) {
        console.error(
          "[Repartidor] No se pudo sumar el sello de fidelidad de la carrera:",
          loyaltyError
        );
      }
    }

    return NextResponse.json({ success: true, ride });
  } catch (err: any) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("Error al actualizar estado de carrera:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
