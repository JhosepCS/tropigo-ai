import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, requirePermission, UnauthorizedError, ForbiddenError, Role } from "@/lib/auth/rbac";

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(["SUPERADMIN", "ADMIN"]);

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        profile: { select: { documentNumber: true } },
        ownedMerchants: { select: { id: true, name: true } },
        riderProfile: { select: { id: true, vehicleType: true, plateNumber: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireRole(["SUPERADMIN", "ADMIN"]);
    const { userId, role, status } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Falta userId" }, { status: 400 });
    }

    // Regla de seguridad: Solo SUPERADMIN puede promover o asignar rol ADMIN o SUPERADMIN
    if (role && (role === "SUPERADMIN" || role === "ADMIN")) {
      await requirePermission("users:create_admin");
    }

    const updateData: any = {};
    if (role) updateData.role = role;
    if (status) updateData.status = status;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, email: true, name: true, role: true, status: true },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
