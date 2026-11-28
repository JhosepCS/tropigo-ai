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

    if (typeof body.name === "string" && body.name.trim().length >= 2) {
      data.name = body.name.trim();
    }

    if (body.description !== undefined) {
      data.description = typeof body.description === "string" ? body.description.trim() || null : null;
    }

    if (body.isActive !== undefined) {
      data.isActive = Boolean(body.isActive);
    }

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

    const hasGeoUpdate =
      body.latitude !== undefined ||
      body.longitude !== undefined ||
      body.category !== undefined ||
      body.streets !== undefined ||
      body.terrainDifficulty !== undefined ||
      body.terrainNote !== undefined;

    if (hasGeoUpdate) {
      let existingGeo: Record<string, any> = {};
      try {
        if (zone.polygonGeoJson) existingGeo = JSON.parse(zone.polygonGeoJson);
      } catch {}

      const nextLat =
        body.latitude !== undefined && body.latitude !== null && body.latitude !== ""
          ? Number(body.latitude)
          : existingGeo.latitude ?? null;
      const nextLng =
        body.longitude !== undefined && body.longitude !== null && body.longitude !== ""
          ? Number(body.longitude)
          : existingGeo.longitude ?? null;

      data.polygonGeoJson = JSON.stringify({
        ...existingGeo,
        latitude: Number.isFinite(nextLat) ? nextLat : null,
        longitude: Number.isFinite(nextLng) ? nextLng : null,
        category: body.category || existingGeo.category || "GENERAL",
        referenceName: (typeof body.name === "string" && body.name.trim()) || zone.name,
        streets: body.streets !== undefined ? String(body.streets || "").trim() : existingGeo.streets || "",
        terrainDifficulty:
          body.terrainDifficulty !== undefined
            ? ["FACIL", "MEDIA", "ALTA"].includes(String(body.terrainDifficulty).toUpperCase())
              ? String(body.terrainDifficulty).toUpperCase()
              : "FACIL"
            : existingGeo.terrainDifficulty || "FACIL",
        terrainNote:
          body.terrainNote !== undefined
            ? String(body.terrainNote || "").trim()
            : existingGeo.terrainNote || "",
      });
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No se enviaron campos válidos para actualizar." },
        { status: 400 }
      );
    }

    const updated = await prisma.deliveryZone.update({
      where: { id },
      data,
      include: { city: true },
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("zones:manage");
    const { id } = await params;

    const zone = await prisma.deliveryZone.findUnique({ where: { id } });
    if (!zone) {
      return NextResponse.json({ error: "Zona no encontrada." }, { status: 404 });
    }

    try {
      await prisma.deliveryZone.delete({ where: { id } });
      return NextResponse.json({ success: true, deleted: true });
    } catch {
      // Si tiene pedidos o viajes históricos ligados, se desactiva para no romper historial
      await prisma.deliveryZone.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({
        success: true,
        deleted: false,
        deactivated: true,
        message: "La zona tenía historial de pedidos, por lo que fue desactivada.",
      });
    }
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "No se pudo eliminar la zona." },
      { status: 500 }
    );
  }
}
