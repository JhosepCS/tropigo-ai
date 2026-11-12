import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getSessionSecret } from "@/lib/auth/secret";

const SECRET_KEY = getSessionSecret();

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Rutas públicas que no requieren autenticación
  const isPublicRoute =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/tracking") ||
    pathname.startsWith("/fidelidad") ||
    pathname.startsWith("/design-system") ||
    pathname.startsWith("/demo") ||
    pathname.startsWith("/api/public") ||
    pathname.startsWith("/api/whatsapp") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/logout") ||
    pathname.startsWith("/api/auth/forgot-password") ||
    pathname.startsWith("/api/auth/reset-password") ||
    pathname.startsWith("/api/auth/bootstrap") ||
    pathname.startsWith("/api/webchat") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".");

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // 2. Comprobar rutas privadas protegidas
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/comercio") ||
    pathname.startsWith("/repartidor") ||
    pathname.startsWith("/cuenta");

  if (!isProtected) {
    return NextResponse.next();
  }

  let token =
    request.cookies.get("tropigo_session")?.value ||
    request.cookies.get("atiende_session")?.value;

  if (!token) {
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    } else {
      token = request.headers.get("x-tropigo-token") || undefined;
    }
  }

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    const role = (payload.role as string) || "";

    // 3. Control de acceso basado en roles (RBAC en Middleware)

    // A. Panel de Administración y Despacho (/dashboard)
    if (pathname.startsWith("/dashboard")) {
      const allowedRoles = ["SUPERADMIN", "ADMIN", "DISPATCHER", "OPERATOR"];
      if (!allowedRoles.includes(role)) {
        if (role === "MERCHANT_OWNER") {
          return NextResponse.redirect(new URL("/comercio", request.url));
        }
        if (role === "RIDER" || role === "MOTOTAXISTA") {
          return NextResponse.redirect(new URL("/repartidor", request.url));
        }
        if (role === "CUSTOMER") {
          return NextResponse.redirect(new URL("/cuenta", request.url));
        }
        return NextResponse.redirect(new URL("/login?error=unauthorized", request.url));
      }
    }

    // B. Panel de Comercios y Cocina (/comercio)
    if (pathname.startsWith("/comercio")) {
      const allowedRoles = ["MERCHANT_OWNER", "ADMIN", "SUPERADMIN"];
      if (!allowedRoles.includes(role)) {
        if (role === "RIDER" || role === "MOTOTAXISTA") {
          return NextResponse.redirect(new URL("/repartidor", request.url));
        }
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    // C. Panel de Repartidores y Flota (/repartidor)
    if (pathname.startsWith("/repartidor")) {
      const allowedRoles = ["RIDER", "MOTOTAXISTA", "ADMIN", "SUPERADMIN"];
      if (!allowedRoles.includes(role)) {
        if (role === "MERCHANT_OWNER") {
          return NextResponse.redirect(new URL("/comercio", request.url));
        }
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    // D. Panel de Cuenta / Perfil (/cuenta)
    // Accesible para todos los roles autenticados (SUPERADMIN, ADMIN, OPERATOR, MERCHANT_OWNER, RIDER, MOTOTAXISTA, CUSTOMER)

    return NextResponse.next();
  } catch (error) {
    // Token inválido, expirado o manipulado
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/comercio/:path*",
    "/repartidor/:path*",
    "/cuenta/:path*",
  ],
};
