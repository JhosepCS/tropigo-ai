import crypto from "crypto";
import { prisma } from "../prisma";
import { getAppUrl } from "../app-url";

/**
 * Enlaces de acceso rápido para repartidores y comercios.
 *
 * Los conductores y cocinas de Ivirgarzama no deberían memorizar correos ni
 * contraseñas largas. Cada entidad recibe un token aleatorio y el enlace se
 * envía por WhatsApp; quien tenga el enlace puede operar su panel. Los tokens
 * se pueden regenerar desde el CRM para revocar accesos filtrados.
 */

export function generateAccessToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export function riderAccessUrl(token: string): string {
  return `${getAppUrl()}/repartidor/acceso/${token}`;
}

export function merchantAccessUrl(token: string): string {
  return `${getAppUrl()}/comercio/acceso/${token}`;
}

/** Devuelve el token del repartidor, generándolo si todavía no existe. */
export async function ensureRiderAccessToken(
  riderId: string
): Promise<string | null> {
  const rider = await prisma.rider.findUnique({
    where: { id: riderId },
    select: { accessToken: true },
  });
  if (!rider) return null;
  if (rider.accessToken) return rider.accessToken;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const updated = await prisma.rider.update({
        where: { id: riderId },
        data: { accessToken: generateAccessToken() },
        select: { accessToken: true },
      });
      return updated.accessToken;
    } catch {
      // Colisión improbable del índice único: se reintenta con otro token.
    }
  }
  return null;
}

/** Devuelve el token del comercio, generándolo si todavía no existe. */
export async function ensureMerchantAccessToken(
  merchantId: string
): Promise<string | null> {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { accessToken: true },
  });
  if (!merchant) return null;
  if (merchant.accessToken) return merchant.accessToken;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const updated = await prisma.merchant.update({
        where: { id: merchantId },
        data: { accessToken: generateAccessToken() },
        select: { accessToken: true },
      });
      return updated.accessToken;
    } catch {
      // Colisión improbable del índice único: se reintenta con otro token.
    }
  }
  return null;
}

/** Regenera el token y devuelve el enlace nuevo (revoca el anterior). */
export async function regenerateRiderAccessToken(
  riderId: string
): Promise<string | null> {
  const updated = await prisma.rider.update({
    where: { id: riderId },
    data: { accessToken: generateAccessToken() },
    select: { accessToken: true },
  });
  return updated.accessToken;
}

export async function regenerateMerchantAccessToken(
  merchantId: string
): Promise<string | null> {
  const updated = await prisma.merchant.update({
    where: { id: merchantId },
    data: { accessToken: generateAccessToken() },
    select: { accessToken: true },
  });
  return updated.accessToken;
}
