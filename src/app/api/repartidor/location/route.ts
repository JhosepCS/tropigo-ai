import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ForbiddenError,
  UnauthorizedError,
  requireAuth,
} from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = [
  "SUPERADMIN",
  "ADMIN",
  "OPERATOR",
  "RIDER",
  "MOTOTAXISTA",
];

function validCoordinate(value: unknown, min: number, max: number): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
  return parsed;
}

/**
 * POST /api/repartidor/location
 * El repartidor comparte su GPS mientras está en turno. La ubicación se usa
 * para el mapa de seguimiento del cliente y para calcular la distancia real.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (!ALLOWED_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "Tu rol no puede compartir ubicación." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const latitude = validCoordinate(body?.latitude, -90, 90);
    const longitude = validCoordinate(body?.longitude, -180, 180);

    if (latitude === null || longitude === null) {
      return NextResponse.json(
        { error: "Coordenadas GPS inválidas." },
        { status: 400 }
      );
    }

    const rider = await prisma.rider.findFirst({
      where: {
        OR: [
          { userId: session.userId },
          ...(session.riderId ? [{ id: session.riderId }] : []),
        ],
      },
      select: { id: true, name: true },
    });

    if (!rider) {
      return NextResponse.json(
        { error: "No tienes un perfil de repartidor activo." },
        { status: 404 }
      );
    }

    await prisma.rider.update({
      where: { id: rider.id },
      data: {
        currentLatitude: latitude,
        currentLongitude: longitude,
        currentLocation: `${latitude.toFixed(6)},${longitude.toFixed(6)}`,
        lastLocationAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      riderId: rider.id,
      latitude,
      longitude,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[RiderLocation] Error:", error);
    return NextResponse.json(
      { error: "No se pudo guardar la ubicación." },
      { status: 500 }
    );
  }
}
