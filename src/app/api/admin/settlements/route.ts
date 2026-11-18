import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/rbac";
import {
  calculateRiderAudit,
  getFleetLiveAudit,
  generateSettlementWhatsAppText,
} from "@/lib/settlements/service";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/settlements
 * - mode=live: Calcula la auditoría y conciliación en vivo del día o periodo seleccionado.
 * - mode=history (default): Devuelve el historial de liquidaciones guardadas en BD.
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole(["SUPERADMIN", "ADMIN", "OPERATOR"]);

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") || "live";
    const riderId = searchParams.get("riderId") || undefined;
    const startDateStr = searchParams.get("startDate") || undefined;
    const endDateStr = searchParams.get("endDate") || undefined;

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    if (mode === "live") {
      if (riderId) {
        const audit = await calculateRiderAudit(riderId, startDate, endDate);
        if (!audit) {
          return NextResponse.json(
            { error: "Repartidor no encontrado." },
            { status: 404 }
          );
        }
        return NextResponse.json({
          audit,
          whatsAppText: generateSettlementWhatsAppText(audit),
        });
      }

      const fleetSummary = await getFleetLiveAudit(startDate, endDate);
      return NextResponse.json(fleetSummary);
    }

    // Modo historial de liquidaciones registradas
    const where: any = {};
    if (riderId) where.riderId = riderId;
    const status = searchParams.get("status");
    if (status) where.status = status;

    const settlements = await prisma.riderSettlement.findMany({
      where,
      include: {
        rider: {
          select: {
            id: true,
            name: true,
            phone: true,
            vehicleType: true,
            plateNumber: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ settlements });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Permisos insuficientes." }, { status: 403 });
    }
    console.error("Error en GET /api/admin/settlements:", error);
    return NextResponse.json(
      { error: "Error al consultar liquidaciones." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/settlements
 * Crea y congela una liquidación oficial para un conductor en un periodo determinado.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(["SUPERADMIN", "ADMIN", "OPERATOR"]);
    const body = await req.json().catch(() => ({}));
    const {
      riderId,
      periodStart,
      periodEnd,
      platformCommissionRate = 0.0,
      markAsPaid = false,
    } = body;

    if (!riderId) {
      return NextResponse.json(
        { error: "Debe especificar el repartidor (riderId)." },
        { status: 400 }
      );
    }

    const startDate = periodStart ? new Date(periodStart) : new Date();
    const endDate = periodEnd ? new Date(periodEnd) : new Date();

    const audit = await calculateRiderAudit(
      riderId,
      startDate,
      endDate,
      Number(platformCommissionRate)
    );

    if (!audit) {
      return NextResponse.json(
        { error: "No se pudo calcular la auditoría del repartidor." },
        { status: 404 }
      );
    }

    // Crear registro en la tabla oficial RiderSettlement
    const settlement = await prisma.riderSettlement.create({
      data: {
        riderId,
        periodStart: new Date(audit.periodStart),
        periodEnd: new Date(audit.periodEnd),
        totalOrdersCount: audit.totalOrdersCount,
        totalRidesCount: audit.totalRidesCount,
        grossEarned: audit.grossEarned,
        platformCommission: audit.platformCommission,
        netPayout: audit.netEarned,
        status: markAsPaid ? "PAGADO" : "PENDIENTE",
        paidAt: markAsPaid ? new Date() : null,
      },
      include: {
        rider: {
          select: {
            id: true,
            name: true,
            phone: true,
            vehicleType: true,
            plateNumber: true,
          },
        },
      },
    });

    // Registrar en auditoría de actividad
    await prisma.activityLog
      .create({
        data: {
          userId: session.userId,
          action: "SETTLEMENT_CREATED",
          entityName: "RiderSettlement",
          entityId: settlement.id,
          provider: "crm",
          status: "success",
          detailsJson: JSON.stringify({
            riderId,
            riderName: audit.rider.name,
            totalServices: audit.totalServicesCount,
            grossEarned: audit.grossEarned,
            netEarned: audit.netEarned,
            balanceDifference: audit.balanceDifference,
            direction: audit.direction,
            markAsPaid,
          }),
        },
      })
      .catch(() => {});

    return NextResponse.json({
      settlement,
      audit,
      whatsAppText: generateSettlementWhatsAppText(audit),
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Permisos insuficientes." }, { status: 403 });
    }
    console.error("Error en POST /api/admin/settlements:", error);
    return NextResponse.json(
      { error: "Error al generar la liquidación." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/settlements
 * Marca una liquidación como PAGADO o actualiza su estado.
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireRole(["SUPERADMIN", "ADMIN", "OPERATOR"]);
    const body = await req.json().catch(() => ({}));
    const { id, status } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Se requiere el ID de la liquidación." },
        { status: 400 }
      );
    }

    const current = await prisma.riderSettlement.findUnique({
      where: { id },
      include: { rider: true },
    });

    if (!current) {
      return NextResponse.json(
        { error: "Liquidación no encontrada." },
        { status: 404 }
      );
    }

    const nextStatus = status === "PAGADO" ? "PAGADO" : "PENDIENTE";
    const updated = await prisma.riderSettlement.update({
      where: { id },
      data: {
        status: nextStatus,
        paidAt: nextStatus === "PAGADO" ? new Date() : null,
      },
      include: {
        rider: {
          select: {
            id: true,
            name: true,
            phone: true,
            vehicleType: true,
            plateNumber: true,
          },
        },
      },
    });

    // Registrar en auditoría
    await prisma.activityLog
      .create({
        data: {
          userId: session.userId,
          action: "SETTLEMENT_STATUS_UPDATED",
          entityName: "RiderSettlement",
          entityId: id,
          provider: "crm",
          status: "success",
          detailsJson: JSON.stringify({
            previousStatus: current.status,
            newStatus: nextStatus,
            riderName: current.rider?.name,
          }),
        },
      })
      .catch(() => {});

    return NextResponse.json({ settlement: updated });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Permisos insuficientes." }, { status: 403 });
    }
    console.error("Error en PATCH /api/admin/settlements:", error);
    return NextResponse.json(
      { error: "Error al actualizar la liquidación." },
      { status: 500 }
    );
  }
}
