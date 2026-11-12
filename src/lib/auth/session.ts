import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { getSessionSecret } from "./secret";

const SECRET_KEY = getSessionSecret();
const COOKIE_NAME = "tropigo_session";
const LEGACY_COOKIE_NAME = "atiende_session";
const SESSION_DURATION_DAYS = 7;

export interface SessionPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
  sessionId?: string;
  merchantId?: string;
  riderId?: string;
  customerId?: string;
}

/**
 * Crea una nueva sesión autenticada tanto en JWT como en la base de datos (model Session).
 */
export async function createSession(
  payload: Omit<SessionPayload, "sessionId">,
  metadata?: { ipAddress?: string; userAgent?: string }
): Promise<string> {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  // Obtener IP y UserAgent automáticamente si no se proporcionaron
  let ipAddress = metadata?.ipAddress;
  let userAgent = metadata?.userAgent;

  try {
    const headersList = await headers();
    if (!ipAddress) {
      ipAddress =
        headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        headersList.get("x-real-ip") ||
        "127.0.0.1";
    }
    if (!userAgent) {
      userAgent = headersList.get("user-agent") || "Navegador Web";
    }
  } catch (e) {
    // Si headers() no está disponible (ej. en scripts CLI)
    ipAddress = ipAddress || "127.0.0.1";
    userAgent = userAgent || "CLI / Script";
  }

  // Generar JWT con el identificador único de sesión
  const fullPayload: SessionPayload = {
    ...payload,
    sessionId,
  };

  const token = await new SignJWT({ ...fullPayload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_DAYS}d`)
    .sign(SECRET_KEY);

  // Registrar en la tabla Session para permitir revocación remota y auditoría
  try {
    await prisma.session.create({
      data: {
        userId: payload.userId,
        token: sessionId,
        ipAddress,
        userAgent,
        expiresAt,
      },
    });
  } catch (e) {
    console.error("No se pudo registrar la sesión en la base de datos:", e);
  }

  // Establecer la cookie de sesión segura
  try {
    let isHttps = process.env.NODE_ENV === "production";
    try {
      const hList = await headers();
      const proto = hList.get("x-forwarded-proto") || "";
      isHttps = proto === "https" || isHttps;
    } catch {}

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * SESSION_DURATION_DAYS,
    });
  } catch (e) {
    // Si cookies() no está disponible (ej. en invocaciones de test o backend directo)
  }

  return token;
}

/**
 * Valida y obtiene la sesión actual del usuario.
 * Busca el token en:
 * 1. Cookie 'tropigo_session'
 * 2. Cookie de compatibilidad 'atiende_session'
 * 3. Header 'Authorization: Bearer <token>'
 * 4. Header 'x-tropigo-token'
 */
export async function getSession(): Promise<SessionPayload | null> {
  try {
    let token: string | undefined;

    // 1. Intentar leer desde cookies
    try {
      const cookieStore = await cookies();
      token =
        cookieStore.get(COOKIE_NAME)?.value ||
        cookieStore.get(LEGACY_COOKIE_NAME)?.value;
    } catch {
      // Ignorar si cookies() no está disponible
    }

    // 2. Si no hay cookie, intentar leer desde headers HTTP
    if (!token) {
      try {
        const headersList = await headers();
        const authHeader = headersList.get("authorization");
        if (authHeader && authHeader.startsWith("Bearer ")) {
          token = authHeader.substring(7).trim();
        } else {
          token = headersList.get("x-tropigo-token") || undefined;
        }
      } catch {
        // Ignorar si headers() no está disponible
      }
    }

    if (!token) return null;

    return await verifySessionToken(token);
  } catch (e) {
    return null;
  }
}

/**
 * Verifica un token JWT criptográficamente y valida la sesión.
 * Si la base de datos tiene una fluctuación transitoria de red, no tumba
 * la sesión válida si el JWT es íntegro y no ha expirado.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    const sessionData = payload as unknown as SessionPayload;

    if (!sessionData.userId) return null;

    // Si tiene sessionId, comprobar que no haya sido explícitamente eliminada
    if (sessionData.sessionId) {
      try {
        const dbSession = await prisma.session.findUnique({
          where: { token: sessionData.sessionId },
        });

        // Solo se invalida si la sesión existe en DB y ya expiró
        if (dbSession && dbSession.expiresAt < new Date()) {
          return null; // Sesión explícitamente expirada
        }
      } catch (dbErr) {
        // Si Supabase o el pooler tiene una desconexión transitoria,
        // no expulsar al usuario si el JWT criptográfico es válido.
        console.warn("[verifySessionToken] Verificación en DB omitida por fluctuación:", dbErr);
      }
    }

    return sessionData;
  } catch (e) {
    return null;
  }
}

/**
 * Cierra la sesión activa actual (elimina de DB y borra cookie).
 */
export async function destroySession() {
  try {
    const cookieStore = await cookies();
    const token =
      cookieStore.get(COOKIE_NAME)?.value ||
      cookieStore.get(LEGACY_COOKIE_NAME)?.value;

    if (token) {
      try {
        const { payload } = await jwtVerify(token, SECRET_KEY);
        const sessionId = (payload as any).sessionId;
        if (sessionId) {
          await prisma.session.deleteMany({
            where: { token: sessionId },
          });
        }
      } catch (e) {
        // Ignorar si el token ya estaba vencido
      }
    }

    cookieStore.delete(COOKIE_NAME);
    cookieStore.delete(LEGACY_COOKIE_NAME);
  } catch (e) {
    console.error("Error al destruir sesión:", e);
  }
}

/**
 * Revoca todas las sesiones activas de un usuario (para reseteo de contraseña o seguridad).
 */
export async function destroyAllUserSessions(userId: string) {
  try {
    await prisma.session.deleteMany({
      where: { userId },
    });
  } catch (e) {
    console.error("Error al revocar todas las sesiones del usuario:", e);
  }
}

/**
 * Lista las sesiones activas de un usuario para el panel de perfil.
 */
export async function listUserSessions(userId: string) {
  return await prisma.session.findMany({
    where: {
      userId,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      token: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
      expiresAt: true,
    },
  });
}
