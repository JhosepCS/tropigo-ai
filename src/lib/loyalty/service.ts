import crypto from "crypto";
import { Prisma } from "@prisma/client";
import QRCode from "qrcode";
import { prisma } from "../prisma";
import { normalizeLoyaltyCode } from "./code";
import { getAppUrl } from "../app-url";

export const DEFAULT_STAMPS_REQUIRED = 10;
export const MIN_STAMPS_REQUIRED = 2;
export const MAX_STAMPS_REQUIRED = 50;

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export interface LoyaltySettings {
  enabled: boolean;
  stampsRequired: number;
  stampsNeeded: number;
  rewardFreeDelivery: boolean;
  rewardDescription: string;
  businessName: string;
  businessPhone: string;
  businessAddress: string;
  currencySymbol: string;
  appUrl: string;
  countRides: boolean;
  /** Promoción de sellos dobles vigente hasta esta fecha (ISO) o null. */
  doubleStampsUntil: string | null;
  doubleStampsActive: boolean;
  /** Sellos que suma cada pedido/carrera: 1 normal, 2 en promoción. */
  stampsPerEvent: number;
}

export type LoyaltyLevel = "BRONCE" | "PLATA" | "ORO";

export interface LoyaltyHistoryItem {
  type: string;
  description: string | null;
  stampsDelta: number;
  stampsAfter: number;
  createdAt: string;
}

export interface LoyaltySummary {
  customerId: string;
  customerName: string;
  code: string;
  stamps: number;
  stampsRequired: number;
  stampsNeeded: number;
  missingForReward: number;
  rewardAvailable: boolean;
  rewardsRedeemed: number;
  totalEarned: number;
  completedOrders: number;
  completedRides: number;
  requestedRides: number;
  countRides: boolean;
  /** Número global del pedido/carrera en el que se activa el próximo premio. */
  nextRewardAtNumber: number;
  qrUrl: string;
  programEnabled: boolean;
  rewardDescription: string;
  level: LoyaltyLevel;
  levelLabel: string;
  levelEmoji: string;
  nextLevelAt: number | null;
  progressPercent: number;
  stampsPerEvent: number;
  doubleStampsActive: boolean;
  doubleStampsUntil: string | null;
  recentEvents: LoyaltyHistoryItem[];
}

export interface LoyaltyDiscount {
  applied: boolean;
  discountAmount: number;
  rewardDescription: string;
  summary: LoyaltySummary | null;
  settings: LoyaltySettings;
}

type LoyaltyDb = Prisma.TransactionClient | typeof prisma;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function finiteNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeStampsRequired(value: unknown): number {
  const parsed = Math.floor(finiteNumber(value, DEFAULT_STAMPS_REQUIRED));
  return Math.min(MAX_STAMPS_REQUIRED, Math.max(MIN_STAMPS_REQUIRED, parsed));
}

export { getAppUrl };

function generateCodeCandidate(): string {
  const bytes = crypto.randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return `TGO-${code}`;
}

/**
 * Garantiza que el cliente tenga un código público único para su QR personal.
 * El código no contiene datos personales y puede mostrarse en la tarjeta física.
 */
export async function ensureLoyaltyCode(
  customerId: string,
  db: LoyaltyDb = prisma
): Promise<string> {
  const customer = await db.customer.findUnique({
    where: { id: customerId },
    select: { id: true, loyaltyCode: true },
  });

  if (!customer) throw new Error("Cliente no encontrado.");
  if (customer.loyaltyCode) return customer.loyaltyCode;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCodeCandidate();
    try {
      const updated = await db.customer.update({
        where: { id: customerId },
        data: { loyaltyCode: code },
        select: { loyaltyCode: true },
      });
      if (updated.loyaltyCode) return updated.loyaltyCode;
    } catch (error: any) {
      // Colisión de código: se reintenta con otro código.
      if (error?.code !== "P2002") throw error;
    }
  }

  throw new Error("No se pudo generar un código de fidelidad único.");
}

export async function getLoyaltySettings(
  db: LoyaltyDb = prisma
): Promise<LoyaltySettings> {
  const business = await db.businessProfile.findFirst({
    select: {
      name: true,
      phone: true,
      address: true,
      currencySymbol: true,
      loyaltyEnabled: true,
      loyaltyStampsRequired: true,
      loyaltyRewardFreeDelivery: true,
      loyaltyRewardDescription: true,
      loyaltyCountRides: true,
      loyaltyDoubleStampsUntil: true,
    },
  });

  const stampsRequired = normalizeStampsRequired(
    business?.loyaltyStampsRequired
  );

  const doubleStampsUntil =
    business?.loyaltyDoubleStampsUntil?.toISOString() || null;
  const doubleStampsActive = Boolean(
    business?.loyaltyDoubleStampsUntil &&
      business.loyaltyDoubleStampsUntil.getTime() > Date.now()
  );

  return {
    enabled: business?.loyaltyEnabled ?? true,
    stampsRequired,
    stampsNeeded: Math.max(1, stampsRequired - 1),
    rewardFreeDelivery: business?.loyaltyRewardFreeDelivery ?? false,
    rewardDescription:
      business?.loyaltyRewardDescription ||
      `${stampsRequired}mo pedido gratis`,
    businessName: business?.name || "TropiGO Ivirgarzama",
    businessPhone: business?.phone || "",
    businessAddress: business?.address || "",
    currencySymbol: business?.currencySymbol || "Bs.",
    appUrl: getAppUrl(),
    countRides: business?.loyaltyCountRides ?? true,
    doubleStampsUntil,
    doubleStampsActive,
    stampsPerEvent: doubleStampsActive ? 2 : 1,
  };
}

/**
 * Nivel de fidelidad calculado con los servicios completados (pedidos
 * entregados + carreras finalizadas). Es informativo y no altera el premio.
 */
export function getLoyaltyLevel(qualifyingEvents: number): {
  level: LoyaltyLevel;
  label: string;
  emoji: string;
  nextLevelAt: number | null;
} {
  const total = Math.max(0, Math.floor(qualifyingEvents));
  if (total >= 30) {
    return { level: "ORO", label: "Oro", emoji: "🥇", nextLevelAt: null };
  }
  if (total >= 10) {
    return { level: "PLATA", label: "Plata", emoji: "🥈", nextLevelAt: 30 };
  }
  return { level: "BRONCE", label: "Bronce", emoji: "🥉", nextLevelAt: 10 };
}

export async function getLoyaltySummary(
  customerId: string,
  db: LoyaltyDb = prisma
): Promise<LoyaltySummary> {
  const [customer, completedOrders, completedRides, recentEvents] = await Promise.all([
    db.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        loyaltyCode: true,
        loyaltyStamps: true,
        loyaltyTotalEarned: true,
        loyaltyRewardsRedeemed: true,
        totalRides: true,
      },
    }),
    db.order.count({
      where: { customerId, status: "ENTREGADO" },
    }),
    db.rideTrip.count({
      where: { customerId, status: "FINALIZADO" },
    }),
    db.loyaltyEvent.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        type: true,
        description: true,
        stampsDelta: true,
        stampsAfter: true,
        createdAt: true,
      },
    }),
  ]);

  if (!customer) throw new Error("Cliente no encontrado.");

  const settings = await getLoyaltySettings(db);
  const code =
    customer.loyaltyCode || (await ensureLoyaltyCode(customer.id, db));
  const stamps = Math.max(0, customer.loyaltyStamps || 0);
  const missingForReward = Math.max(0, settings.stampsNeeded - stamps);
  const rewardAvailable = settings.enabled && stamps >= settings.stampsNeeded;
  const qualifyingEvents =
    completedOrders + (settings.countRides ? completedRides : 0);
  const levelInfo = getLoyaltyLevel(qualifyingEvents);
  const progressPercent = Math.min(
    100,
    Math.round((stamps / Math.max(1, settings.stampsNeeded)) * 100)
  );

  return {
    customerId: customer.id,
    customerName: customer.name || "Cliente TropiGO",
    code,
    stamps,
    stampsRequired: settings.stampsRequired,
    stampsNeeded: settings.stampsNeeded,
    missingForReward,
    rewardAvailable,
    rewardsRedeemed: customer.loyaltyRewardsRedeemed || 0,
    totalEarned: customer.loyaltyTotalEarned || 0,
    completedOrders,
    completedRides,
    requestedRides: customer.totalRides || 0,
    countRides: settings.countRides,
    nextRewardAtNumber: qualifyingEvents + missingForReward + 1,
    qrUrl: `${settings.appUrl}/fidelidad/${encodeURIComponent(code)}`,
    programEnabled: settings.enabled,
    rewardDescription: settings.rewardDescription,
    level: levelInfo.level,
    levelLabel: levelInfo.label,
    levelEmoji: levelInfo.emoji,
    nextLevelAt: levelInfo.nextLevelAt,
    progressPercent,
    stampsPerEvent: settings.stampsPerEvent,
    doubleStampsActive: settings.doubleStampsActive,
    doubleStampsUntil: settings.doubleStampsUntil,
    recentEvents: recentEvents.map((event) => ({
      type: event.type,
      description: event.description,
      stampsDelta: event.stampsDelta,
      stampsAfter: event.stampsAfter,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}

/**
 * Calcula el descuento de fidelidad que corresponde a una cotización.
 * El premio se aplica a los productos y, si está configurado, también al envío.
 */
export async function getLoyaltyDiscountForQuote(
  customerId: string,
  subtotal: number,
  deliveryFee: number
): Promise<LoyaltyDiscount> {
  const settings = await getLoyaltySettings();
  const summary = await getLoyaltySummary(customerId);

  if (!settings.enabled || !summary.rewardAvailable) {
    return {
      applied: false,
      discountAmount: 0,
      rewardDescription: settings.rewardDescription,
      summary,
      settings,
    };
  }

  const maximumDiscount = round2(Math.max(0, subtotal) + Math.max(0, deliveryFee));
  const rawDiscount = round2(
    Math.max(0, subtotal) + (settings.rewardFreeDelivery ? Math.max(0, deliveryFee) : 0)
  );

  return {
    applied: rawDiscount > 0,
    discountAmount: Math.min(maximumDiscount, rawDiscount),
    rewardDescription: settings.rewardDescription,
    summary,
    settings,
  };
}

async function hasEvent(
  tx: Prisma.TransactionClient,
  customerId: string,
  orderId: string,
  type: string
): Promise<boolean> {
  const existing = await tx.loyaltyEvent.findFirst({
    where: { customerId, orderId, type },
    select: { id: true },
  });
  return Boolean(existing);
}

/**
 * Reserva el premio al confirmar el pedido: los sellos se reinician para que
 * no puedan usarse dos premios simultáneos. Si el pedido se cancela, se restauran.
 */
export async function reserveLoyaltyReward(
  tx: Prisma.TransactionClient,
  input: { customerId: string; orderId: string; orderNumber: string }
): Promise<{ reserved: boolean; reason?: string }> {
  const settings = await getLoyaltySettings(tx);
  if (!settings.enabled) {
    return { reserved: false, reason: "El programa de fidelidad está desactivado." };
  }

  if (await hasEvent(tx, input.customerId, input.orderId, "RESERVED")) {
    return { reserved: true };
  }

  const customer = await tx.customer.findUnique({
    where: { id: input.customerId },
    select: { loyaltyStamps: true },
  });

  if (!customer || customer.loyaltyStamps < settings.stampsNeeded) {
    return {
      reserved: false,
      reason: "El cliente ya no tiene un premio de fidelidad disponible.",
    };
  }

  const previousStamps = customer.loyaltyStamps;

  await tx.customer.update({
    where: { id: input.customerId },
    data: { loyaltyStamps: 0 },
  });

  await tx.loyaltyEvent.create({
    data: {
      customerId: input.customerId,
      orderId: input.orderId,
      type: "RESERVED",
      stampsDelta: -previousStamps,
      stampsAfter: 0,
      description: `Premio reservado para el pedido ${input.orderNumber}`,
    },
  });

  return { reserved: true };
}

/**
 * Sella el pedido al entregarse. Es idempotente por pedido.
 * - Pedido normal: suma un sello (con tope en el sello anterior al premio).
 * - Pedido con premio: marca el premio como canjeado y deja la tarjeta en cero.
 */
export async function awardLoyaltyOnDelivery(
  tx: Prisma.TransactionClient,
  order: {
    id: string;
    orderNumber: string;
    customerId: string;
    loyaltyRewardApplied: boolean;
    loyaltyStampsAwarded: boolean;
  }
): Promise<void> {
  if (order.loyaltyStampsAwarded) return;

  const settings = await getLoyaltySettings(tx);
  if (!settings.enabled) return;

  if (order.loyaltyRewardApplied) {
    if (!(await hasEvent(tx, order.customerId, order.id, "REDEEMED"))) {
      await tx.customer.update({
        where: { id: order.customerId },
        data: {
          loyaltyStamps: 0,
          loyaltyRewardsRedeemed: { increment: 1 },
        },
      });

      await tx.loyaltyEvent.create({
        data: {
          customerId: order.customerId,
          orderId: order.id,
          type: "REDEEMED",
          stampsDelta: 0,
          stampsAfter: 0,
          description: `Premio de fidelidad canjeado en el pedido ${order.orderNumber}`,
        },
      });
    }

    await tx.order.update({
      where: { id: order.id },
      data: { loyaltyStampsAwarded: true },
    });
    return;
  }

  if (await hasEvent(tx, order.customerId, order.id, "EARNED")) {
    await tx.order.update({
      where: { id: order.id },
      data: { loyaltyStampsAwarded: true },
    });
    return;
  }

  const customer = await tx.customer.findUnique({
    where: { id: order.customerId },
    select: { loyaltyStamps: true },
  });
  if (!customer) return;

  const previousStamps = customer.loyaltyStamps;
  const stampsToAdd = settings.stampsPerEvent;
  const newStamps = Math.min(previousStamps + stampsToAdd, settings.stampsNeeded);

  await tx.customer.update({
    where: { id: order.customerId },
    data: {
      loyaltyStamps: newStamps,
      loyaltyTotalEarned: { increment: stampsToAdd },
    },
  });

  await tx.loyaltyEvent.create({
    data: {
      customerId: order.customerId,
      orderId: order.id,
      type: "EARNED",
      stampsDelta: newStamps - previousStamps,
      stampsAfter: newStamps,
      description:
        newStamps >= settings.stampsNeeded
          ? `¡Tarjeta completa con el pedido ${order.orderNumber}! El próximo pedido es gratis.`
          : `Sello${stampsToAdd > 1 ? "s dobles" : ""} ganado${
              stampsToAdd > 1 ? "s" : ""
            } con el pedido ${order.orderNumber}`,
    },
  });

  await tx.order.update({
    where: { id: order.id },
    data: { loyaltyStampsAwarded: true },
  });
}

/**
 * Sella una carrera de mototaxi finalizada. Es idempotente por carrera.
 * Solo suma si el programa está activo y la opción "contar carreras" está
 * habilitada en Ajustes. El premio sigue siendo un pedido gratis.
 */
export async function awardLoyaltyOnRideCompletionById(
  rideId: string
): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      const ride = await tx.rideTrip.findUnique({
        where: { id: rideId },
        select: {
          id: true,
          tripNumber: true,
          customerId: true,
          status: true,
          loyaltyStampsAwarded: true,
        },
      });

      if (
        !ride ||
        ride.status !== "FINALIZADO" ||
        ride.loyaltyStampsAwarded
      ) {
        return;
      }

      const settings = await getLoyaltySettings(tx);
      if (!settings.enabled || !settings.countRides) return;

      const alreadyEarned = await tx.loyaltyEvent.findFirst({
        where: {
          customerId: ride.customerId,
          rideId: ride.id,
          type: "EARNED_RIDE",
        },
        select: { id: true },
      });

      if (alreadyEarned) {
        await tx.rideTrip.update({
          where: { id: ride.id },
          data: { loyaltyStampsAwarded: true },
        });
        return;
      }

      // Marca la carrera como sellada de forma condicional para evitar
      // duplicados si dos peticiones llegan al mismo tiempo.
      const claimed = await tx.rideTrip.updateMany({
        where: { id: ride.id, loyaltyStampsAwarded: false },
        data: { loyaltyStampsAwarded: true },
      });
      if (claimed.count === 0) return;

      const customer = await tx.customer.findUnique({
        where: { id: ride.customerId },
        select: { loyaltyStamps: true },
      });
      if (!customer) return;

      const previousStamps = customer.loyaltyStamps;
      const stampsToAdd = settings.stampsPerEvent;
      const newStamps = Math.min(previousStamps + stampsToAdd, settings.stampsNeeded);

      await tx.customer.update({
        where: { id: ride.customerId },
        data: {
          loyaltyStamps: newStamps,
          loyaltyTotalEarned: { increment: stampsToAdd },
        },
      });

      await tx.loyaltyEvent.create({
        data: {
          customerId: ride.customerId,
          rideId: ride.id,
          type: "EARNED_RIDE",
          stampsDelta: newStamps - previousStamps,
          stampsAfter: newStamps,
          description:
            newStamps >= settings.stampsNeeded
              ? `¡Tarjeta completa con la carrera ${ride.tripNumber}! El próximo pedido es gratis.`
              : `Sello${stampsToAdd > 1 ? "s dobles" : ""} ganado${
                  stampsToAdd > 1 ? "s" : ""
                } con la carrera ${ride.tripNumber}`,
        },
      });
    },
    { timeout: 15000, maxWait: 10000 }
  );
}

/**
 * Si un pedido con premio se cancela antes de entregarse, devuelve los sellos
 * que habían sido reservados para que el cliente no pierda su tarjeta.
 */
export async function restoreLoyaltyOnCancellation(
  tx: Prisma.TransactionClient,
  order: {
    id: string;
    orderNumber: string;
    customerId: string;
    loyaltyRewardApplied: boolean;
  }
): Promise<void> {
  if (!order.loyaltyRewardApplied) return;
  if (await hasEvent(tx, order.customerId, order.id, "RESTORED")) return;

  const settings = await getLoyaltySettings(tx);
  const reservation = await tx.loyaltyEvent.findFirst({
    where: { customerId: order.customerId, orderId: order.id, type: "RESERVED" },
    select: { stampsDelta: true },
  });

  const restoreTo = Math.max(
    0,
    reservation ? Math.abs(reservation.stampsDelta) : settings.stampsNeeded
  );

  const customer = await tx.customer.findUnique({
    where: { id: order.customerId },
    select: { loyaltyStamps: true },
  });
  if (!customer) return;

  const previousStamps = customer.loyaltyStamps;
  const newStamps = Math.min(
    settings.stampsNeeded,
    previousStamps + restoreTo
  );

  await tx.customer.update({
    where: { id: order.customerId },
    data: { loyaltyStamps: newStamps },
  });

  await tx.loyaltyEvent.create({
    data: {
      customerId: order.customerId,
      orderId: order.id,
      type: "RESTORED",
      stampsDelta: newStamps - previousStamps,
      stampsAfter: newStamps,
      description: `Sellos restaurados por la cancelación del pedido ${order.orderNumber}`,
    },
  });
}

export async function addManualStamp(
  customerId: string,
  createdBy?: string,
  note?: string
): Promise<{ ok: true; summary: LoyaltySummary } | { ok: false; error: string }> {
  try {
    const settings = await getLoyaltySettings();
    if (!settings.enabled) {
      return { ok: false, error: "El programa de fidelidad está desactivado." };
    }

    await ensureLoyaltyCode(customerId);

    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: { id: customerId },
        select: { loyaltyStamps: true, name: true },
      });
      if (!customer) return { ok: false as const, error: "Cliente no encontrado." };

      if (customer.loyaltyStamps >= settings.stampsNeeded) {
        return {
          ok: false as const,
          error: "El cliente ya tiene un premio disponible. Canjéalo antes de agregar más sellos.",
        };
      }

      const newStamps = Math.min(
        settings.stampsNeeded,
        customer.loyaltyStamps + 1
      );

      await tx.customer.update({
        where: { id: customerId },
        data: {
          loyaltyStamps: newStamps,
          loyaltyTotalEarned: { increment: 1 },
        },
      });

      await tx.loyaltyEvent.create({
        data: {
          customerId,
          type: "MANUAL_STAMP",
          stampsDelta: newStamps - customer.loyaltyStamps,
          stampsAfter: newStamps,
          description:
            note?.trim() ||
            (newStamps >= settings.stampsNeeded
              ? "Sello manual: tarjeta completa, premio disponible."
              : "Sello agregado manualmente desde el CRM."),
          createdBy: createdBy || null,
        },
      });

      return { ok: true as const };
    }, { timeout: 15000, maxWait: 10000 });

    if (!result.ok) return result;
    return { ok: true, summary: await getLoyaltySummary(customerId) };
  } catch (error: any) {
    console.error("[Loyalty] Error al agregar sello manual:", error);
    return { ok: false, error: error.message || "No se pudo agregar el sello." };
  }
}

export async function redeemRewardManually(
  customerId: string,
  createdBy?: string,
  note?: string
): Promise<{ ok: true; summary: LoyaltySummary } | { ok: false; error: string }> {
  try {
    const settings = await getLoyaltySettings();
    if (!settings.enabled) {
      return { ok: false, error: "El programa de fidelidad está desactivado." };
    }

    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: { id: customerId },
        select: { loyaltyStamps: true },
      });
      if (!customer) return { ok: false as const, error: "Cliente no encontrado." };

      if (customer.loyaltyStamps < settings.stampsNeeded) {
        return {
          ok: false as const,
          error: `El cliente aún no completó su tarjeta. Tiene ${customer.loyaltyStamps} de ${settings.stampsNeeded} sellos.`,
        };
      }

      await tx.customer.update({
        where: { id: customerId },
        data: {
          loyaltyStamps: 0,
          loyaltyRewardsRedeemed: { increment: 1 },
        },
      });

      await tx.loyaltyEvent.create({
        data: {
          customerId,
          type: "MANUAL_REDEEM",
          stampsDelta: -customer.loyaltyStamps,
          stampsAfter: 0,
          description:
            note?.trim() || "Premio canjeado manualmente desde el CRM.",
          createdBy: createdBy || null,
        },
      });

      return { ok: true as const };
    }, { timeout: 15000, maxWait: 10000 });

    if (!result.ok) return result;
    return { ok: true, summary: await getLoyaltySummary(customerId) };
  } catch (error: any) {
    console.error("[Loyalty] Error al canjear premio:", error);
    return { ok: false, error: error.message || "No se pudo canjear el premio." };
  }
}

export async function getLoyaltyCardByCode(code: string) {
  const normalized = normalizeLoyaltyCode(code);
  if (!normalized) return null;

  const customer = await prisma.customer.findUnique({
    where: { loyaltyCode: normalized },
    select: {
      id: true,
      name: true,
      loyaltyCode: true,
      loyaltyStamps: true,
      loyaltyTotalEarned: true,
      loyaltyRewardsRedeemed: true,
      totalRides: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
  });

  if (!customer) return null;

  const [settings, completedOrders, completedRides, recentEvents] = await Promise.all([
    getLoyaltySettings(),
    prisma.order.count({
      where: { customerId: customer.id, status: "ENTREGADO" },
    }),
    prisma.rideTrip.count({
      where: { customerId: customer.id, status: "FINALIZADO" },
    }),
    prisma.loyaltyEvent.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        type: true,
        description: true,
        stampsDelta: true,
        stampsAfter: true,
        createdAt: true,
      },
    }),
  ]);

  const stamps = Math.max(0, customer.loyaltyStamps);
  const missingForReward = Math.max(0, settings.stampsNeeded - stamps);
  const rewardAvailable = settings.enabled && stamps >= settings.stampsNeeded;
  const qualifyingEvents =
    completedOrders + (settings.countRides ? completedRides : 0);
  const levelInfo = getLoyaltyLevel(qualifyingEvents);

  return {
    code: customer.loyaltyCode || normalized,
    displayName: maskCustomerName(customer.name),
    stamps,
    stampsRequired: settings.stampsRequired,
    stampsNeeded: settings.stampsNeeded,
    missingForReward,
    rewardAvailable,
    rewardsRedeemed: customer.loyaltyRewardsRedeemed,
    totalEarned: customer.loyaltyTotalEarned,
    totalOrders: customer._count.orders,
    completedOrders,
    completedRides,
    requestedRides: customer.totalRides,
    countRides: settings.countRides,
    nextRewardAtNumber: qualifyingEvents + missingForReward + 1,
    memberSince: customer.createdAt,
    level: levelInfo.level,
    levelLabel: levelInfo.label,
    levelEmoji: levelInfo.emoji,
    nextLevelAt: levelInfo.nextLevelAt,
    stampsPerEvent: settings.stampsPerEvent,
    doubleStampsActive: settings.doubleStampsActive,
    doubleStampsUntil: settings.doubleStampsUntil,
    recentEvents: recentEvents.map((event) => ({
      type: event.type,
      description: event.description,
      stampsDelta: event.stampsDelta,
      stampsAfter: event.stampsAfter,
      createdAt: event.createdAt.toISOString(),
    })),
    settings,
  };
}

export function maskCustomerName(name?: string | null): string {
  const clean = String(name || "").trim();
  if (!clean) return "Cliente TropiGO";
  const parts = clean.split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1].charAt(0).toUpperCase()}.`;
}

export async function buildLoyaltyQrDataUrl(code: string): Promise<string> {
  const url = `${getAppUrl()}/fidelidad/${encodeURIComponent(code)}`;
  return QRCode.toDataURL(url, {
    width: 640,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#064E3B", light: "#FFFFFF" },
  });
}
