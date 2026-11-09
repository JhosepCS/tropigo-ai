import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { identifier } = await req.json();

    if (!identifier || typeof identifier !== "string") {
      return NextResponse.json(
        { error: "Debes proporcionar tu correo electrónico o teléfono registrado" },
        { status: 400 }
      );
    }

    const cleanIdentifier = identifier.trim().toLowerCase();

    // Buscar por correo o por teléfono
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanIdentifier },
          { phone: cleanIdentifier },
        ],
      },
    });

    // Mensaje genérico para prevenir enumeración de usuarios
    const genericResponse = {
      success: true,
      message:
        "Si los datos corresponden a una cuenta registrada en TropiGO, se ha generado el enlace para restablecer tu contraseña.",
    };

    if (!user) {
      return NextResponse.json(genericResponse);
    }

    // Invalida tokens previos no utilizados para este usuario
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Generar un token criptográficamente seguro
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hora de validez

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // En entorno de desarrollo o local, facilitamos el enlace directo para pruebas
    const isDev = process.env.NODE_ENV !== "production";
    const resetUrl = `/reset-password?token=${token}`;

    console.log(`[TropiGO Auth] Token de recuperación generado para ${user.email}: ${token}`);

    return NextResponse.json({
      ...genericResponse,
      ...(isDev ? { debugToken: token, resetUrl } : {}),
    });
  } catch (error: any) {
    console.error("Error en forgot-password:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud de recuperación" },
      { status: 500 }
    );
  }
}
