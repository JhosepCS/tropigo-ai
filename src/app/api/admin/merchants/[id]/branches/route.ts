import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertMerchantOwnership, UnauthorizedError, ForbiddenError } from "@/lib/auth/rbac";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const branches = await prisma.merchantBranch.findMany({
      where: { merchantId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, branches });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al obtener sucursales" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    // Validación estricta: Solo el dueño del comercio o administradores pueden crear sucursales
    await assertMerchantOwnership(session.userId, id);

    const { name, phone, address, latitude, longitude, isOpen = true } = await req.json();

    if (!name || !address) {
      return NextResponse.json(
        { error: "Nombre de sucursal y dirección son obligatorios" },
        { status: 400 }
      );
    }

    const branch = await prisma.merchantBranch.create({
      data: {
        merchantId: id,
        name: String(name).trim(),
        phone: phone ? String(phone).trim() : null,
        address: String(address).trim(),
        latitude: typeof latitude === "number" ? latitude : null,
        longitude: typeof longitude === "number" ? longitude : null,
        isOpen: Boolean(isOpen),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Sucursal registrada correctamente",
      branch,
    });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: error.message || "Error al crear sucursal" }, { status: 500 });
  }
}
