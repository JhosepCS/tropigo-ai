import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, UnauthorizedError } from "@/lib/auth/rbac";
import { listUserSessions } from "@/lib/auth/session";

export async function GET() {
  try {
    const session = await requireAuth();

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        profile: {
          select: {
            documentNumber: true,
            avatarUrl: true,
            internalNotes: true,
          },
        },
        riderProfile: {
          select: {
            id: true,
            vehicleType: true,
            plateNumber: true,
            isAvailable: true,
            rating: true,
            totalDeliveries: true,
            totalRides: true,
          },
        },
        ownedMerchants: {
          select: {
            id: true,
            name: true,
            category: true,
            isOpen: true,
          },
        },
        customerProfile: {
          select: {
            id: true,
            totalOrders: true,
            totalRides: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const sessions = await listUserSessions(user.id);

    return NextResponse.json({
      success: true,
      user,
      activeSessions: sessions,
    });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Error al obtener perfil" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { name, phone, documentNumber } = await req.json();

    const updateUserData: any = {};
    if (name && typeof name === "string") updateUserData.name = name.trim();
    if (phone && typeof phone === "string") updateUserData.phone = phone.trim();

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: {
        ...updateUserData,
        profile: documentNumber
          ? {
              upsert: {
                create: { documentNumber: String(documentNumber).trim() },
                update: { documentNumber: String(documentNumber).trim() },
              },
            }
          : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        profile: { select: { documentNumber: true } },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Perfil actualizado correctamente",
      user: updatedUser,
    });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Error al actualizar perfil" }, { status: 500 });
  }
}
