import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/rbac";

export async function GET() {
  try {
    const categories = await prisma.commercialCategory.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      include: {
        _count: { select: { merchants: true } },
      },
    });

    return NextResponse.json({ success: true, categories });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al obtener categorías" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(["SUPERADMIN", "ADMIN"]);
    const { name, icon, order } = await req.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "El nombre de categoría es obligatorio" }, { status: 400 });
    }

    const cleanName = name.trim();
    const slug = cleanName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const existing = await prisma.commercialCategory.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json({ error: "Ya existe una categoría con ese nombre" }, { status: 400 });
    }

    const category = await prisma.commercialCategory.create({
      data: {
        name: cleanName,
        slug,
        icon: icon || "Store",
        order: typeof order === "number" ? order : 0,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, category });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: error.message || "Error al crear categoría" }, { status: 500 });
  }
}
