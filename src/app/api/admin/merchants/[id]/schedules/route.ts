import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertMerchantOwnership, UnauthorizedError, ForbiddenError } from "@/lib/auth/rbac";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const schedules = await prisma.merchantSchedule.findMany({
      where: { merchantId: id },
      orderBy: { dayOfWeek: "asc" },
    });

    return NextResponse.json({ success: true, schedules });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al obtener horarios" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    await assertMerchantOwnership(session.userId, id);

    const { schedules } = await req.json();

    if (!Array.isArray(schedules)) {
      return NextResponse.json(
        { error: "Se espera un listado de horarios para los días de la semana" },
        { status: 400 }
      );
    }

    // Actualizar de forma atómica los horarios semanales
    await prisma.$transaction(async (tx) => {
      for (const item of schedules) {
        if (typeof item.dayOfWeek === "number") {
          const existing = await tx.merchantSchedule.findFirst({
            where: { merchantId: id, dayOfWeek: item.dayOfWeek },
          });

          if (existing) {
            await tx.merchantSchedule.update({
              where: { id: existing.id },
              data: {
                openTime: item.openTime || "08:00",
                closeTime: item.closeTime || "22:00",
                isClosed: Boolean(item.isClosed),
              },
            });
          } else {
            await tx.merchantSchedule.create({
              data: {
                merchantId: id,
                dayOfWeek: item.dayOfWeek,
                openTime: item.openTime || "08:00",
                closeTime: item.closeTime || "22:00",
                isClosed: Boolean(item.isClosed),
              },
            });
          }
        }
      }
    });

    const updatedSchedules = await prisma.merchantSchedule.findMany({
      where: { merchantId: id },
      orderBy: { dayOfWeek: "asc" },
    });

    return NextResponse.json({
      success: true,
      message: "Horarios comerciales actualizados exitosamente",
      schedules: updatedSchedules,
    });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    console.error("Error al actualizar horarios:", error);
    return NextResponse.json({ error: error.message || "Error al guardar horarios" }, { status: 500 });
  }
}
