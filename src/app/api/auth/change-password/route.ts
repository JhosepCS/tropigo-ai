import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { requireAuth, UnauthorizedError } from "@/lib/auth/rbac";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Debes ingresar tu contraseña actual y la nueva contraseña" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "La nueva contraseña debe tener al menos 8 caracteres" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, password: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: "La contraseña actual es incorrecta" },
        { status: 400 }
      );
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: newHash },
    });

    // Revocar todas las demás sesiones excepto la actual si tiene sessionId
    if (session.sessionId) {
      await prisma.session.deleteMany({
        where: {
          userId: user.id,
          token: { not: session.sessionId },
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Contraseña cambiada exitosamente. Las demás sesiones han sido cerradas por seguridad.",
    });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || "Error al cambiar la contraseña" },
      { status: 500 }
    );
  }
}
