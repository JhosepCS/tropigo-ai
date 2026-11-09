import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertMerchantOwnership, UnauthorizedError, ForbiddenError } from "@/lib/auth/rbac";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { productId, isAvailable } = await req.json();

    if (!productId) {
      return NextResponse.json({ error: "Falta el identificador del producto" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, merchantId: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    // Validación estricta en servidor: solo el dueño del comercio o administradores pueden modificarlo
    await assertMerchantOwnership(session.userId, product.merchantId);

    const updated = await prisma.product.update({
      where: { id: productId },
      data: { isAvailable: Boolean(isAvailable) },
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (err: any) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("Error al actualizar disponibilidad de producto:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
