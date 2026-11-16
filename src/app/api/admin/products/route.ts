import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/rbac";

export async function POST(req: NextRequest) {
  try {
    await requireRole(["SUPERADMIN", "ADMIN", "OPERATOR"]);
    const body = await req.json();

    const {
      merchantId,
      name,
      price,
      category,
      description,
      imageUrl,
      isAvailable = true,
      preparationMinutes = 15,
    } = body;

    if (!merchantId || typeof merchantId !== "string") {
      return NextResponse.json({ error: "Debes seleccionar un comercio." }, { status: 400 });
    }

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "El nombre del producto es obligatorio (mínimo 2 letras)." },
        { status: 400 }
      );
    }

    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return NextResponse.json(
        { error: "El precio debe ser un número válido mayor a 0 Bs." },
        { status: 400 }
      );
    }

    const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) {
      return NextResponse.json({ error: "El comercio seleccionado no existe." }, { status: 404 });
    }

    const product = await prisma.product.create({
      data: {
        merchantId,
        name: name.trim(),
        price: parsedPrice,
        category: category?.trim() || "General",
        description: description?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        isAvailable: Boolean(isAvailable),
        preparationMinutes: Number(preparationMinutes) || 15,
      },
      include: {
        merchant: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Producto creado exitosamente en el catálogo.",
      product,
    });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    console.error("Error al crear producto:", error);
    return NextResponse.json({ error: error.message || "Error al crear producto" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireRole(["SUPERADMIN", "ADMIN", "OPERATOR"]);
    const body = await req.json();
    const { id, isAvailable, price, name, description, imageUrl, category } = body;

    if (!id) {
      return NextResponse.json({ error: "Falta el ID del producto." }, { status: 400 });
    }

    const updateData: any = {};
    if (isAvailable !== undefined) updateData.isAvailable = Boolean(isAvailable);
    if (price !== undefined) updateData.price = Number(price);
    if (name !== undefined) updateData.name = String(name).trim();
    if (description !== undefined) updateData.description = String(description).trim();
    if (imageUrl !== undefined) updateData.imageUrl = String(imageUrl).trim();
    if (category !== undefined) updateData.category = String(category).trim();

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        merchant: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      product: updated,
    });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: error.message || "Error al actualizar producto" }, { status: 500 });
  }
}
