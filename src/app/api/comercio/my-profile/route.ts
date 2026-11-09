import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/rbac";

export async function GET() {
  try {
    const session = await requireRole(["MERCHANT_OWNER", "ADMIN", "SUPERADMIN"]);

    let merchant = await prisma.merchant.findFirst({
      where: session.role === "MERCHANT_OWNER" ? { ownerId: session.userId } : {},
      include: {
        city: true,
        commercialCategory: true,
        branches: { orderBy: { createdAt: "asc" } },
        schedules: { orderBy: { dayOfWeek: "asc" } },
        _count: { select: { products: true, orders: true } },
      },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: "No tienes ningún comercio vinculado a tu cuenta" },
        { status: 404 }
      );
    }

    // Calcular estadísticas
    const orders = await prisma.order.findMany({
      where: { merchantId: merchant.id, status: "ENTREGADO" },
      select: { totalAmount: true },
    });

    const totalRevenueBs = orders.reduce((sum, o) => sum + o.totalAmount, 0);

    return NextResponse.json({
      success: true,
      merchant,
      stats: {
        completedOrders: orders.length,
        totalRevenueBs: Number(totalRevenueBs.toFixed(2)),
        rating: merchant.rating,
      },
    });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: error.message || "Error al obtener perfil de comercio" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireRole(["MERCHANT_OWNER", "ADMIN", "SUPERADMIN"]);

    const merchant = await prisma.merchant.findFirst({
      where: session.role === "MERCHANT_OWNER" ? { ownerId: session.userId } : {},
      select: { id: true },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: "No tienes ningún comercio vinculado a tu cuenta" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      name,
      phone,
      address,
      description,
      isOpen,
      imageUrl,
      logoUrl,
      bannerUrl,
      latitude,
      longitude,
    } = body;

    const updateData: any = {};
    if (name) updateData.name = String(name).trim();
    if (phone !== undefined) updateData.phone = phone ? String(phone).trim() : null;
    if (address !== undefined) updateData.address = address ? String(address).trim() : null;
    if (description !== undefined) updateData.description = description ? String(description).trim() : null;
    if (isOpen !== undefined) updateData.isOpen = Boolean(isOpen);
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl || null;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl || null;
    if (bannerUrl !== undefined) updateData.bannerUrl = bannerUrl || null;
    if (latitude !== undefined) updateData.latitude = typeof latitude === "number" ? latitude : null;
    if (longitude !== undefined) updateData.longitude = typeof longitude === "number" ? longitude : null;

    const updated = await prisma.merchant.update({
      where: { id: merchant.id },
      data: updateData,
      include: {
        city: true,
        commercialCategory: true,
        branches: true,
        schedules: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Perfil de comercio actualizado exitosamente",
      merchant: updated,
    });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: error.message || "Error al actualizar perfil de comercio" }, { status: 500 });
  }
}
