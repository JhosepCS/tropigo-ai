import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { destroyAllUserSessions } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Token de recuperación inválido o ausente" },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        { error: "La nueva contraseña debe tener al menos 8 caracteres" },
        { status: 400 }
      );
    }

    // Buscar token en la base de datos
    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { token: token.trim() },
      include: { user: true },
    });

    if (!resetRecord) {
      return NextResponse.json(
        { error: "El enlace de recuperación es inválido o no existe" },
        { status: 400 }
      );
    }

    if (resetRecord.usedAt) {
      return NextResponse.json(
        { error: "Este enlace de recuperación ya ha sido utilizado anteriormente" },
        { status: 400 }
      );
    }

    if (resetRecord.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "El enlace de recuperación ha expirado. Por favor solicita uno nuevo" },
        { status: 400 }
      );
    }

    // Generar hash bcrypt seguro de 12 rondas
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Actualizar contraseña del usuario y marcar token como usado
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { password: passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    // Invalidar todas las sesiones activas del usuario para forzar re-autenticación
    await destroyAllUserSessions(resetRecord.userId);

    return NextResponse.json({
      success: true,
      message: "Tu contraseña ha sido actualizada exitosamente. Ya puedes iniciar sesión.",
    });
  } catch (error: any) {
    console.error("Error en reset-password:", error);
    return NextResponse.json(
      { error: "Error interno al restablecer la contraseña" },
      { status: 500 }
    );
  }
}
