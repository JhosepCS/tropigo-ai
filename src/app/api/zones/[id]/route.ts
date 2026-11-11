import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requirePermission,
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/auth/rbac";
import { ABSOLUTE_MIN_RIDE_FARE } from "@/lib/rides/fare";

export const dynamic = "force-dynamic";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("zones:manage");

    const { id } = await params;
    const body = await req.json();
    const zone = await prisma.deliveryZone.findUnique({ where: { id } });
    if (!zone) {
      return NextResponse.json({ error: "Zona no encontrada." }, { status: 404 });
    }

    const business = await prisma.businessProfile.findFirst({
      select: { rideMinFare: true },
    });
    const minimumRideFare = Math.max(
      ABSOLUTE_MIN_RIDE_FARE,
      Number(business?.rideMinFare) || ABSOLUTE_MIN_RIDE_FARE
    );

    const data: Record<string, unknown> = {};

    if (body.baseDeliveryCost !== undefined) {
      const value = Number(body.baseDeliveryCost);
      if (!Number.isFinite(value) || value < 0 || value > 500) {
        return NextResponse.json(
          { error: "La tarifa de delivery debe estar entre 0 y 500 Bs." },
          { status: 400 }
        );
      }
      data.baseDeliveryCost = round2(value);
    }

    if (body.baseRideCost !== undefined) {
      const value = Number(body.baseRideCost);
      if (!Number.isFinite(value) || value < minimumRideFare || value > 500) {
        return NextResponse.json(
          {
            error: `La tarifa de carrera no puede ser menor a ${minimumRideFare.toFixed(
              2
            )} Bs. (tarifa mínima oficial).`,
          },
          { status: 400 }
        );
      }
      data.baseRideCost = round2(value);
    }

    if (body.estimatedMinutes !== undefined) {
      const value = Math.floor(Number(body.estimatedMinutes));
      if (!Number.isFinite(value) || value < 1 || value > 240) {
        return NextResponse.json(
          { error: "El tiempo estimado debe estar entre 1 y 240 minutos." },
          { status: 400 }
        );
      }
      data.estimatedMinutes = value;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No se enviaron tarifas para actualizar." },
        { status: 400 }
      );
    }

    const updated = await prisma.deliveryZone.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, zone: updated });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[Zones] Error al actualizar tarifas:", error);
    return NextResponse.json(
      { error: error.message || "No se pudieron actualizar las tarifas." },
      { status: 500 }
    );
  }
}
