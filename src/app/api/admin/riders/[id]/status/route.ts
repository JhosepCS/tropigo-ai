import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireRole,
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/auth/rbac";
import {
  ensureRiderAccessToken,
  regenerateRiderAccessToken,
  riderAccessUrl,
} from "@/lib/access/tokens";
import { notifyRiderApproved } from "@/lib/whatsapp/notifications";

export const dynamic = "force-dynamic";

const ACTIONS = [
  "approve",
  "reject",
  "suspend",
  "activate",
  "deactivate",
  "send-link",
  "regenerate-link",
];

/**
 * POST /api/admin/riders/[id]/status
 * Aprueba, rechaza, suspende, apaga o enciende un repartidor y genera su
 * enlace de acceso rápido. Solo administración y operación.
 *
 * - deactivate: lo saca de turno sin marcarlo como suspendido. No recibe
 *   carreras nuevas y su enlace muestra "cuenta en pausa". Se bloquea si
 *   tiene carreras ASIGNADO o EN_CAMINO para no dejarlas a medias.
 * - activate: lo vuelve a poner en turno con el mismo enlace.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["SUPERADMIN", "ADMIN", "OPERATOR"]);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "").trim();

    if (!ACTIONS.includes(action)) {
      return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
    }

    const rider = await prisma.rider.findUnique({
      where: { id },
      select: { id: true, name: true, phone: true, status: true, isActive: true },
    });
    if (!rider) {
      return NextResponse.json(
        { error: "Repartidor no encontrado." },
        { status: 404 }
      );
    }

    let accessUrl: string | null = null;
    let status = rider.status;
    let isActive = rider.isActive;
    let isAvailable: boolean | null = null;

    if (action === "approve") {
      status = "ACTIVO";
      isActive = true;
      isAvailable = true;
      await prisma.rider.update({
        where: { id },
        data: { status, isActive: true, isAvailable: true },
      });
      const token = await ensureRiderAccessToken(id);
      if (token) accessUrl = riderAccessUrl(token);
      // Aviso por WhatsApp con su enlace personal (fire-and-forget).
      notifyRiderApproved(id).catch(() => {});
    } else if (action === "reject") {
      status = "RECHAZADO";
      isActive = false;
      isAvailable = false;
      await prisma.rider.update({
        where: { id },
        data: { status, isActive: false, isAvailable: false },
      });
    } else if (action === "suspend") {
      status = "SUSPENDIDO";
      isActive = false;
      isAvailable = false;
      await prisma.rider.update({
        where: { id },
        data: { status, isActive: false, isAvailable: false },
      });
    } else if (action === "deactivate") {
      if (rider.status !== "ACTIVO") {
        return NextResponse.json(
          {
            error:
              "Solo puedes apagar a un repartidor aprobado. Si está suspendido o rechazado, usa Reactivar.",
          },
          { status: 409 }
        );
      }
      const activeOrders = await prisma.order.count({
        where: {
          assignedRiderId: id,
          status: { in: ["ASIGNADO", "EN_CAMINO"] },
        },
      });
      if (activeOrders > 0) {
        return NextResponse.json(
          {
            error: `Tiene ${activeOrders} carrera(s) en curso. Pídele que las termine antes de apagarlo.`,
            activeOrders,
          },
          { status: 409 }
        );
      }
      isActive = false;
      isAvailable = false;
      await prisma.rider.update({
        where: { id },
        data: { isActive: false, isAvailable: false },
      });
    } else if (action === "activate") {
      if (rider.status !== "ACTIVO") {
        return NextResponse.json(
          {
            error:
              "Este repartidor está suspendido o rechazado. Usa Reactivar repartidor para volver a aprobarlo.",
          },
          { status: 409 }
        );
      }
      isActive = true;
      isAvailable = true;
      await prisma.rider.update({
        where: { id },
        data: { isActive: true, isAvailable: true },
      });
    } else if (action === "regenerate-link") {
      const token = await regenerateRiderAccessToken(id);
      if (token) accessUrl = riderAccessUrl(token);
    } else if (action === "send-link") {
      if (rider.status !== "ACTIVO" || !rider.isActive) {
        return NextResponse.json(
          {
            error:
              "Primero aprueba y enciende al repartidor para enviar su enlace.",
          },
          { status: 409 }
        );
      }
      const token = await ensureRiderAccessToken(id);
      if (token) accessUrl = riderAccessUrl(token);
      notifyRiderApproved(id).catch(() => {});
    }

    await prisma.activityLog
      .create({
        data: {
          userId: session.userId,
          action: `RIDER_${action.toUpperCase().replace(/-/g, "_")}`,
          entityName: "Rider",
          entityId: id,
          provider: "crm",
          channel: "crm",
          status: "success",
          detailsJson: JSON.stringify({
            riderName: rider.name,
            phone: rider.phone,
            newStatus: status,
            isActive,
            isAvailable,
          }),
        },
      })
      .catch(() => {});

    return NextResponse.json({
      success: true,
      status,
      isActive,
      isAvailable,
      accessUrl,
    });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[AdminRiderStatus] Error:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar al repartidor." },
      { status: 500 }
    );
  }
}
