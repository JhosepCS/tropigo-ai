import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, UnauthorizedError, ForbiddenError } from "@/lib/auth/rbac";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();

    let targetCustomerId = session.customerId;

    // Si es Superadmin o Admin, puede consultar el historial de un cliente en particular
    if (["SUPERADMIN", "ADMIN", "OPERATOR"].includes(session.role)) {
      const paramId = req.nextUrl.searchParams.get("customerId");
      if (paramId) targetCustomerId = paramId;
    }

    if (!targetCustomerId) {
      // Buscar el customer vinculado al usuario
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        include: { customerProfile: true },
      });
      targetCustomerId = user?.customerProfile?.id;
    }

    if (!targetCustomerId) {
      return NextResponse.json({ orders: [], rides: [] });
    }

    // Consulta estrictamente limitada al cliente autenticado
    const [orders, rides] = await Promise.all([
      prisma.order.findMany({
        where: { customerId: targetCustomerId },
        include: {
          merchant: { select: { id: true, name: true, category: true } },
          items: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.rideTrip.findMany({
        where: { customerId: targetCustomerId },
        include: {
          assignedRider: { select: { id: true, name: true, vehicleType: true, plateNumber: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      orders,
      rides,
    });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error al obtener pedidos del cliente:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
