import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, UnauthorizedError } from "@/lib/auth/rbac";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Falta el identificador de sesión" }, { status: 400 });
    }

    // Asegurar que solo pueda revocar sus propias sesiones
    await prisma.session.deleteMany({
      where: {
        id: sessionId,
        userId: session.userId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Sesión remota finalizada correctamente",
    });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Error al revocar sesión" }, { status: 500 });
  }
}
