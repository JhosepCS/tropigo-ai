import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertMerchantOwnership, UnauthorizedError, ForbiddenError } from "@/lib/auth/rbac";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; branchId: string }> }
) {
  try {
    const session = await requireAuth();
    const { id, branchId } = await params;

    await assertMerchantOwnership(session.userId, id);

    const body = await req.json();
    const { name, phone, address, latitude, longitude, isOpen } = body;

    const updateData: any = {};
    if (name) updateData.name = String(name).trim();
    if (phone !== undefined) updateData.phone = phone ? String(phone).trim() : null;
    if (address) updateData.address = String(address).trim();
    if (latitude !== undefined) updateData.latitude = typeof latitude === "number" ? latitude : null;
    if (longitude !== undefined) updateData.longitude = typeof longitude === "number" ? longitude : null;
    if (isOpen !== undefined) updateData.isOpen = Boolean(isOpen);

    const updated = await prisma.merchantBranch.update({
      where: { id: branchId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: "Sucursal actualizada correctamente",
      branch: updated,
    });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: error.message || "Error al actualizar sucursal" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; branchId: string }> }
) {
  try {
    const session = await requireAuth();
    const { id, branchId } = await params;

    await assertMerchantOwnership(session.userId, id);

    await prisma.merchantBranch.delete({
      where: { id: branchId },
    });

    return NextResponse.json({
      success: true,
      message: "Sucursal eliminada correctamente",
    });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: error.message || "Error al eliminar sucursal" }, { status: 500 });
  }
}
