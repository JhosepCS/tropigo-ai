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

const ACTIONS = ["approve", "reject", "suspend", "send-link", "regenerate-link"];

/**
 * POST /api/admin/riders/[id]/status
 * Aprueba, rechaza o suspende un repartidor registrado desde la web y genera
 * su enlace de acceso rápido. Solo administración y operación.
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

    if (action === "approve") {
      status = "ACTIVO";
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
      await prisma.rider.update({
        where: { id },
        data: { status, isActive: false, isAvailable: false },
      });
    } else if (action === "suspend") {
      status = "SUSPENDIDO";
      await prisma.rider.update({
        where: { id },
        data: { status, isActive: false, isAvailable: false },
      });
    } else if (action === "regenerate-link") {
      const token = await regenerateRiderAccessToken(id);
      if (token) accessUrl = riderAccessUrl(token);
    } else if (action === "send-link") {
      if (rider.status !== "ACTIVO" || !rider.isActive) {
        return NextResponse.json(
          { error: "Primero aprueba al repartidor para enviar su enlace." },
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
          }),
        },
      })
      .catch(() => {});

    return NextResponse.json({ success: true, status, accessUrl });
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
