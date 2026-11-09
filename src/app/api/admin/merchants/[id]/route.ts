import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/rbac";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const merchant = await prisma.merchant.findUnique({
      where: { id },
      include: {
        city: true,
        commercialCategory: true,
        owner: {
          select: { id: true, name: true, email: true, phone: true, role: true },
        },
        branches: {
          orderBy: { createdAt: "asc" },
        },
        schedules: {
          orderBy: { dayOfWeek: "asc" },
        },
        products: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        orders: {
          orderBy: { createdAt: "desc" },
          take: 15,
          include: {
            customer: { select: { id: true, name: true, phone: true } },
            assignedRider: { select: { id: true, name: true } },
            items: true,
          },
        },
      },
    });

    if (!merchant) {
      return NextResponse.json({ error: "Comercio no encontrado" }, { status: 404 });
    }

    // Calcular estadísticas financieras y operativas del comercio en Bs.
    const allOrders = await prisma.order.findMany({
      where: { merchantId: id },
      select: { totalAmount: true, status: true },
    });

    const totalOrdersCount = allOrders.length;
    const completedOrders = allOrders.filter((o) => o.status === "ENTREGADO");
    const totalRevenueBs = completedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const commissionGeneratedBs = totalRevenueBs * merchant.commissionRate;
    const averageTicketBs = completedOrders.length > 0 ? totalRevenueBs / completedOrders.length : 0;

    const stats = {
      totalOrders: totalOrdersCount,
      completedOrdersCount: completedOrders.length,
      totalRevenueBs: Number(totalRevenueBs.toFixed(2)),
      commissionGeneratedBs: Number(commissionGeneratedBs.toFixed(2)),
      averageTicketBs: Number(averageTicketBs.toFixed(2)),
      rating: merchant.rating,
    };

    return NextResponse.json({
      success: true,
      merchant,
      stats,
    });
  } catch (error: any) {
    console.error("Error al obtener detalle del comercio:", error);
    return NextResponse.json({ error: error.message || "Error al obtener comercio" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["SUPERADMIN", "ADMIN"]);
    const { id } = await params;
    const body = await req.json();

    const allowedFields = [
      "name",
      "legalName",
      "nit",
      "phone",
      "address",
      "description",
      "category",
      "categoryId",
      "cityId",
      "ownerId",
      "commissionRate",
      "isOpen",
      "imageUrl",
      "logoUrl",
      "bannerUrl",
      "latitude",
      "longitude",
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === "commissionRate" && typeof body[field] === "number") {
          updateData[field] = Math.max(0, Math.min(0.5, body[field]));
        } else if (field === "isOpen") {
          updateData[field] = Boolean(body[field]);
        } else if (field === "latitude" || field === "longitude") {
          updateData[field] = typeof body[field] === "number" ? body[field] : null;
        } else if (typeof body[field] === "string") {
          updateData[field] = body[field].trim();
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const updated = await prisma.merchant.update({
      where: { id },
      data: updateData,
      include: {
        city: true,
        commercialCategory: true,
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Comercio actualizado correctamente",
      merchant: updated,
    });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    console.error("Error al actualizar comercio:", error);
    return NextResponse.json({ error: error.message || "Error al actualizar comercio" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["SUPERADMIN", "ADMIN"]);
    const { id } = await params;

    // Marcamos como cerrado para no violar restricciones de clave foránea con órdenes previas
    const deactivated = await prisma.merchant.update({
      where: { id },
      data: { isOpen: false },
    });

    return NextResponse.json({
      success: true,
      message: "Comercio desactivado del catálogo público exitosamente",
      merchant: deactivated,
    });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: error.message || "Error al desactivar comercio" }, { status: 500 });
  }
}
