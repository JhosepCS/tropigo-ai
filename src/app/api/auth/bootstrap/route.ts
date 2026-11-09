import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    // 1. Verificación obligatoria: ¿Ya existe algún Superadministrador en la base de datos?
    const existingSuperadmin = await prisma.user.findFirst({
      where: { role: "SUPERADMIN" },
      select: { id: true, email: true },
    });

    if (existingSuperadmin) {
      return NextResponse.json(
        {
          error: "Acceso denegado. El primer superadministrador ya ha sido inicializado en TropiGO.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { email, name, password, bootstrapSecret } = body;

    // 2. Si hay un BOOTSTRAP_SECRET configurado en las variables de entorno, exigirlo
    const expectedSecret = process.env.BOOTSTRAP_SECRET;
    if (expectedSecret) {
      const providedSecret =
        req.headers.get("x-bootstrap-secret") || bootstrapSecret;

      if (!providedSecret || providedSecret !== expectedSecret) {
        return NextResponse.json(
          { error: "Secreto de bootstrap inválido o no suministrado" },
          { status: 401 }
        );
      }
    }

    if (!email || !password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Debes proporcionar un correo válido y una contraseña de al menos 8 caracteres" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const superadmin = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        name: (name || "Superadministrador TropiGO").trim(),
        password: passwordHash,
        role: "SUPERADMIN",
        status: "ACTIVE",
        profile: {
          create: {
            documentNumber: "SUPERADMIN-BOOTSTRAP",
            internalNotes: "Inicializado a través del endpoint seguro de arranque",
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Primer superadministrador inicializado exitosamente en TropiGO.",
      user: superadmin,
    });
  } catch (error: any) {
    console.error("Error en bootstrap API:", error);
    return NextResponse.json(
      { error: error.message || "Error al inicializar superadministrador" },
      { status: 500 }
    );
  }
}
