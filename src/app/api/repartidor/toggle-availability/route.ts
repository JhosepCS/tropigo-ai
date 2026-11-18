import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, UnauthorizedError, ForbiddenError } from "@/lib/auth/rbac";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { isAvailable, riderId } = await req.json();

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { riderProfile: true },
    });

    if (!user) throw new UnauthorizedError();

    let targetRiderId = user.riderProfile?.id;

    // Si es administrador u operador y envió un riderId específico
    if (["SUPERADMIN", "ADMIN", "OPERATOR"].includes(user.role) && riderId) {
      targetRiderId = riderId;
    }

    if (!targetRiderId) {
      return NextResponse.json(
        { error: "No tienes un perfil de repartidor o mototaxista asociado" },
        { status: 400 }
      );
    }

    const rider = await prisma.rider.findUnique({
      where: { id: targetRiderId },
      select: { isActive: true, status: true },
    });
    if (!rider) {
      return NextResponse.json(
        { error: "Repartidor no encontrado." },
        { status: 404 }
      );
    }

    // Un repartidor apagado por la central no puede ponerse en turno solo.
    if (Boolean(isAvailable) && (!rider.isActive || rider.status !== "ACTIVO")) {
      return NextResponse.json(
        {
          error:
            "Tu cuenta está apagada por la central. Pide que te enciendan para volver a recibir carreras.",
        },
        { status: 409 }
      );
    }

    await prisma.rider.update({
      where: { id: targetRiderId },
      data: { isAvailable: Boolean(isAvailable) },
    });

    return NextResponse.json({ success: true, isAvailable: Boolean(isAvailable) });
  } catch (err: any) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("Error al actualizar disponibilidad de conductor:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
