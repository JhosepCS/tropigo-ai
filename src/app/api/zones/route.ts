import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, UnauthorizedError, ForbiddenError } from "@/lib/auth/rbac";
import { ABSOLUTE_MIN_RIDE_FARE } from "@/lib/rides/fare";

export const dynamic = "force-dynamic";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function GET() {
  try {
    const zones = await prisma.deliveryZone.findMany({
      include: { city: true },
      orderBy: { baseDeliveryCost: "asc" },
    });
    return NextResponse.json({ success: true, zones });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al obtener zonas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission("zones:manage");
    const body = await req.json();

    const {
      name,
      cityId,
      description,
      baseDeliveryCost,
      baseRideCost,
      estimatedMinutes = 20,
      latitude,
      longitude,
    } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "El nombre de la zona es obligatorio (mínimo 2 letras)." },
        { status: 400 }
      );
    }

    const business = await prisma.businessProfile.findFirst({
      select: { rideMinFare: true },
    });
    const minimumRideFare = Math.max(
      ABSOLUTE_MIN_RIDE_FARE,
      Number(business?.rideMinFare) || ABSOLUTE_MIN_RIDE_FARE
    );

    const deliveryCostNum = Number(baseDeliveryCost);
    if (!Number.isFinite(deliveryCostNum) || deliveryCostNum < 0 || deliveryCostNum > 500) {
      return NextResponse.json(
        { error: "La tarifa de delivery debe estar entre 0 y 500 Bs." },
        { status: 400 }
      );
    }

    const rideCostNum = Number(baseRideCost);
    if (!Number.isFinite(rideCostNum) || rideCostNum < minimumRideFare || rideCostNum > 500) {
      return NextResponse.json(
        {
          error: `La tarifa de carrera debe ser al menos ${minimumRideFare.toFixed(
            2
          )} Bs. (tarifa mínima oficial).`,
        },
        { status: 400 }
      );
    }

    // Resolver ciudad si no se especifica
    let finalCityId = cityId;
    if (!finalCityId) {
      const defaultCity = await prisma.city.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
      });
      finalCityId = defaultCity?.id || null;
    }

    // GeoJson de coordenadas si se especificaron
    let polygonGeoJson: string | null = null;
    if (typeof latitude === "number" && typeof longitude === "number") {
      polygonGeoJson = JSON.stringify({
        latitude,
        longitude,
        referenceName: name.trim(),
      });
    }

    const newZone = await prisma.deliveryZone.create({
      data: {
        name: name.trim(),
        cityId: finalCityId,
        description: description?.trim() || null,
        baseDeliveryCost: round2(deliveryCostNum),
        baseRideCost: round2(rideCostNum),
        estimatedMinutes: Math.max(5, Math.min(240, Number(estimatedMinutes) || 20)),
        polygonGeoJson,
        isActive: true,
      },
      include: {
        city: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Zona de cobertura registrada exitosamente.",
      zone: newZone,
    });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    console.error("Error al registrar zona:", error);
    return NextResponse.json({ error: error.message || "Error al crear zona" }, { status: 500 });
  }
}
