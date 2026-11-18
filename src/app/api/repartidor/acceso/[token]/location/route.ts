import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function validCoordinate(value: unknown, min: number, max: number): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
  return parsed;
}

/**
 * POST /api/repartidor/acceso/[token]/location
 * GPS en vivo desde el enlace de acceso rápido del repartidor (sin sesión).
 * El token es la credencial; solo actualiza el rider dueño del enlace.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const rider = await prisma.rider.findUnique({
      where: { accessToken: token },
      select: { id: true, isActive: true, status: true },
    });

    if (!rider) {
      return NextResponse.json({ error: "Enlace no válido." }, { status: 404 });
    }
    if (!rider.isActive || rider.status !== "ACTIVO") {
      return NextResponse.json(
        { error: "Tu cuenta está en pausa o todavía no está aprobada." },
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
      latitude,
      longitude,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[RiderAccessLocation] Error:", error);
    return NextResponse.json(
      { error: "No se pudo guardar la ubicación." },
      { status: 500 }
    );
  }
}
