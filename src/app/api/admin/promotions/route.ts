import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const promotions = await prisma.promotion.findMany({
      include: {
        merchant: { select: { id: true, name: true } },
      },
      orderBy: { startsAt: "desc" },
    });
    return NextResponse.json({ success: true, promotions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al obtener promociones" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(["SUPERADMIN", "ADMIN", "OPERATOR"]);
    const body = await req.json();

    const {
      title,
      description,
      discountPercent,
      merchantId,
      scheduleDays,
      scheduleStart,
      scheduleEnd,
      autoAnnounce = true,
      announceMessage,
      isActive = true,
    } = body;

    if (!title || typeof title !== "string" || title.trim().length < 2) {
      return NextResponse.json(
        { error: "El título de la promoción es obligatorio." },
        { status: 400 }
      );
    }

    const codeBase = title
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 10);
    const code = `${codeBase || "PROMO"}-${Date.now().toString().slice(-4)}`;

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const promo = await prisma.promotion.create({
      data: {
        code,
        title: title.trim(),
        discountType: "PERCENTAGE",
        discountValue: Number(discountPercent) || 10,
        merchantId: merchantId || null,
        startsAt: new Date(),
        expiresAt,
        scheduleDays: JSON.stringify(
          Array.isArray(scheduleDays)
            ? scheduleDays
            : ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]
        ),
        scheduleStart: scheduleStart || "11:00",
        scheduleEnd: scheduleEnd || "23:00",
        autoAnnounce: Boolean(autoAnnounce),
        announceMessage: announceMessage?.trim() || `¡Aprovecha hoy nuestra promoción: ${title.trim()}!`,
        isActive: Boolean(isActive),
      },
      include: {
        merchant: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Promoción creada exitosamente.",
      promotion: promo,
    });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: error.message || "Error al crear promoción" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireRole(["SUPERADMIN", "ADMIN", "OPERATOR"]);
    const body = await req.json();
    const { id, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "Falta el ID de la promoción." }, { status: 400 });
    }

    const updated = await prisma.promotion.update({
      where: { id },
      data: { isActive: Boolean(isActive) },
    });

    return NextResponse.json({ success: true, promotion: updated });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: error.message || "Error al actualizar promoción" }, { status: 500 });
  }
}
