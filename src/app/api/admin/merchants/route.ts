import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/rbac";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "";
    const cityId = searchParams.get("cityId")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "12", 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { legalName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { address: { contains: search, mode: "insensitive" } },
        { nit: { contains: search } },
      ];
    }

    if (category && category !== "TODOS") {
      where.OR = [
        { category: { equals: category, mode: "insensitive" } },
        { commercialCategory: { slug: category } },
      ];
    }

    if (cityId) {
      where.cityId = cityId;
    }

    if (status === "open") {
      where.isOpen = true;
    } else if (status === "closed") {
      where.isOpen = false;
    }

    const [merchants, total] = await Promise.all([
      prisma.merchant.findMany({
        where,
        include: {
          city: { select: { id: true, name: true } },
          commercialCategory: { select: { id: true, name: true, slug: true } },
          owner: { select: { id: true, name: true, email: true, phone: true } },
          _count: {
            select: {
              products: true,
              orders: true,
              branches: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.merchant.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      merchants,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error al listar comercios:", error);
    return NextResponse.json({ error: error.message || "Error al obtener comercios" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(["SUPERADMIN", "ADMIN"]);
    const body = await req.json();

    const {
      name,
      legalName,
      nit,
      category,
      categoryId,
      cityId,
      ownerId,
      phone,
      address,
      description,
      commissionRate,
      isOpen = true,
      imageUrl,
      logoUrl,
      bannerUrl,
      latitude,
      longitude,
    } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "El nombre del comercio es obligatorio (mínimo 2 caracteres)" },
        { status: 400 }
      );
    }

    // Resolver ciudad predeterminada (Ivirgarzama) si no se especifica
    let finalCityId = cityId;
    if (!finalCityId) {
      const defaultCity = await prisma.city.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
      });
      finalCityId = defaultCity?.id;
    }

    // Resolver slug único
    const baseSlug = name
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    let slug = baseSlug;
    let counter = 1;
    while (await prisma.merchant.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    // Tasa de comisión (rango 0% a 50%)
    let finalCommission = 0.10;
    if (typeof commissionRate === "number") {
      finalCommission = Math.max(0, Math.min(0.5, commissionRate));
    }

    const merchant = await prisma.merchant.create({
      data: {
        name: name.trim(),
        slug,
        legalName: legalName?.trim() || null,
        nit: nit?.trim() || null,
        category: category || "Restaurante",
        categoryId: categoryId || null,
        cityId: finalCityId || null,
        ownerId: ownerId || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        description: description?.trim() || null,
        commissionRate: finalCommission,
        isOpen: Boolean(isOpen),
        imageUrl: imageUrl || null,
        logoUrl: logoUrl || null,
        bannerUrl: bannerUrl || null,
        latitude: typeof latitude === "number" ? latitude : null,
        longitude: typeof longitude === "number" ? longitude : null,
      },
      include: {
        city: true,
        commercialCategory: true,
      },
    });

    // Generar horarios iniciales estándar de 7 días (Lunes a Domingo 08:00 a 22:00)
    const defaultSchedules = [];
    for (let day = 0; day <= 6; day++) {
      defaultSchedules.push({
        merchantId: merchant.id,
        dayOfWeek: day,
        openTime: "08:00",
        closeTime: "22:00",
        isClosed: false,
      });
    }

    await prisma.merchantSchedule.createMany({
      data: defaultSchedules,
    });

    return NextResponse.json({
      success: true,
      message: "Comercio registrado exitosamente",
      merchant,
    });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    console.error("Error al registrar comercio:", error);
    return NextResponse.json({ error: error.message || "Error al crear comercio" }, { status: 500 });
  }
}
