import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth/session";

const SESSION_DURATION_DAYS = 7;
const COOKIE_NAME = "tropigo_session";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Debes ingresar tu correo o teléfono y tu contraseña" },
        { status: 400 }
      );
    }

    const cleanIdentifier = String(email).trim().toLowerCase();

    // Permitir inicio de sesión con correo electrónico o número telefónico
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanIdentifier },
          { phone: cleanIdentifier },
          { phone: cleanIdentifier.startsWith("+") ? cleanIdentifier : `+591${cleanIdentifier}` },
        ],
      },
      include: {
        riderProfile: { select: { id: true } },
        ownedMerchants: { select: { id: true }, take: 1 },
        customerProfile: { select: { id: true } },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Correo, teléfono o contraseña incorrectos" },
        { status: 401 }
      );
    }

    // Verificar estado de la cuenta
    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Tu cuenta se encuentra inactiva o suspendida. Contacta a soporte TropiGO" },
        { status: 403 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Correo, teléfono o contraseña incorrectos" },
        { status: 401 }
      );
    }

    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "Navegador Web";

    const token = await createSession(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        merchantId: user.ownedMerchants[0]?.id,
        riderId: user.riderProfile?.id,
        customerId: user.customerProfile?.id,
      },
      { ipAddress, userAgent }
    );

    // Setear cookie directamente en el header de respuesta para garantizar
    // que Vercel (Edge) y todos los navegadores la reciban correctamente.
    const proto = req.headers.get("x-forwarded-proto") || "";
    const isHttps = proto === "https" || req.url.startsWith("https://");
    const maxAge = 60 * 60 * 24 * SESSION_DURATION_DAYS;

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    // Cookie principal HttpOnly
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      path: "/",
      maxAge,
    });

    // Cookie secundaria de compatibilidad
    response.cookies.set("atiende_session", token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      path: "/",
      maxAge,
    });

    // Cookie informativa para el cliente JS
    response.cookies.set("tropigo_logged_in", "true", {
      httpOnly: false,
      secure: isHttps,
      sameSite: "lax",
      path: "/",
      maxAge,
    });

    return response;
  } catch (error: any) {
    console.error("Error en login:", error);
    return NextResponse.json({ error: error.message || "Error interno del servidor" }, { status: 500 });
  }
}
