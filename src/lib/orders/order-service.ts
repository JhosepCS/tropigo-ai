import crypto from "crypto";
import { DeliveryZone, Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import {
  estimarTiempoMinutos,
  formatoDistanciaKm,
} from "../geo/distance";
import { getAppUrl } from "../app-url";
import { calcularDeliveryDesdeCentro } from "../geo/delivery-center";
import {
  normalizePaymentMethodCode,
  paymentMethodLabel,
} from "../payments/types";
import {
  awardLoyaltyOnDelivery,
  getLoyaltyDiscountForQuote,
  getLoyaltySettings,
  reserveLoyaltyReward,
  restoreLoyaltyOnCancellation,
} from "../loyalty/service";
import { createOrderCalendarEvent } from "../calendar/google-calendar";

// =================================================================
// TIPOS PÚBLICOS
// =================================================================

export interface OrderToolContext {
  customerId?: string;
  conversationId?: string;
  confirmationVerified?: boolean;
  operatorConfirmed?: boolean;
  source?: "WHATSAPP" | "WEBCHAT" | "CRM" | "PUBLIC" | "SYSTEM";
  actorUserId?: string;
  actorRole?: string;
}

export interface QuoteItemInput {
  producto: string;
  cantidad: number;
  variante?: string;
  opciones?: string[];
  notas?: string;
}

export interface CreateQuoteInput {
  comercio: string;
  items: QuoteItemInput[];
  direccionEntrega: string;
  zonaDestino?: string;
  referencia?: string;
  latitud?: number;
  longitud?: number;
  metodoPago?: string;
  notasCliente?: string;
}

export interface QuoteSnapshotItem {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  variantName: string | null;
  options: string[];
  specialInstructions: string | null;
}

export class OrderTransitionError extends Error {
  statusCode = 409;
  constructor(message: string) {
    super(message);
    this.name = "OrderTransitionError";
  }
}

export class OrderAccessError extends Error {
  statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = "OrderAccessError";
  }
}

// =================================================================
// UTILIDADES
// =================================================================

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeText(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function matchUnique<T>(
  items: T[],
  query: string,
  getName: (item: T) => string
): T | null {
  const q = normalizeText(query);
  if (!q) return null;

  const exact = items.filter((item) => normalizeText(getName(item)) === q);
  if (exact.length === 1) return exact[0];

  const starts = items.filter((item) => normalizeText(getName(item)).startsWith(q));
  if (starts.length === 1) return starts[0];

  const contains = items.filter((item) => normalizeText(getName(item)).includes(q));
  if (contains.length === 1) return contains[0];

  return null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Busca un término completo dentro de un texto normalizado.
 * Evita que "Villa 14" coincida con "Villa 140" o "Centro" con "Centralia".
 */
function containsTerm(haystack: string, term: string): boolean {
  if (!haystack || !term) return false;
  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(term)}([^a-z0-9]|$)`);
  return pattern.test(haystack);
}

export interface ZoneLookupResult {
  zone: DeliveryZone | null;
  ambiguous: boolean;
  zones: DeliveryZone[];
}

/**
 * Resuelve una zona activa a partir de una zona explícita o una dirección.
 * Regla estricta: si hay coincidencia exacta, se usa; si hay varias coincidencias
 * parciales, se devuelve ambigüedad y se pide al cliente que precise el barrio.
 * Nunca se cae silenciosamente a "Casco Central" ni a la primera zona.
 */
export async function findActiveZoneForQuery(query: string): Promise<ZoneLookupResult> {
  const zones = await prisma.deliveryZone.findMany({
    where: { isActive: true },
    orderBy: { baseDeliveryCost: "asc" },
  });

  const q = normalizeText(query);
  if (!q) {
    return { zone: null, ambiguous: false, zones };
  }

  const exact = zones.filter((zone) => normalizeText(zone.name) === q);
  if (exact.length === 1) {
    return { zone: exact[0], ambiguous: false, zones };
  }

  const candidates = zones.filter((zone) => {
    const zoneName = normalizeText(zone.name);
    const zoneDescription = normalizeText(zone.description || "");
    return (
      containsTerm(q, zoneName) ||
      (zoneDescription.length > 0 && containsTerm(q, zoneDescription)) ||
      containsTerm(zoneName, q)
    );
  });

  if (candidates.length === 1) {
    return { zone: candidates[0], ambiguous: false, zones };
  }

  if (candidates.length > 1) {
    return { zone: null, ambiguous: true, zones: candidates };
  }

  return { zone: null, ambiguous: false, zones };
}

function getBoliviaTimeParts(): { dayOfWeek: number; time: string } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/La_Paz",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const weekday = parts.find((p) => p.type === "weekday")?.value || "Sun";
  const hour = Number(parts.find((p) => p.type === "hour")?.value || "0");
  const minute = parts.find((p) => p.type === "minute")?.value || "00";
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    dayOfWeek: dayMap[weekday] ?? 0,
    time: `${String(hour === 24 ? 0 : hour).padStart(2, "0")}:${minute}`,
  };
}

function timeToMinutes(value: string): number {
  const [h, m] = value.split(":").map((n) => Number(n));
  return (h || 0) * 60 + (m || 0);
}

function isTimeWithin(time: string, open: string, close: string): boolean {
  const t = timeToMinutes(time);
  const o = timeToMinutes(open);
  const c = timeToMinutes(close);
  if (c <= o) {
    // Horario que cruza medianoche.
    return t >= o || t <= c;
  }
  return t >= o && t <= c;
}

export async function isMerchantOpenNow(merchant: {
  id: string;
  name: string;
  isOpen: boolean;
}): Promise<{ open: boolean; reason: string; today: string }> {
  if (!merchant.isOpen) {
    return {
      open: false,
      reason: `${merchant.name.replace(/^\[DEMO\]\s*/i, "")} está cerrado en este momento.`,
      today: "Interruptor manual cerrado",
    };
  }

  const schedules = await prisma.merchantSchedule.findMany({
    where: { merchantId: merchant.id },
    orderBy: { dayOfWeek: "asc" },
  });

  if (schedules.length === 0) {
    return {
      open: true,
      reason: "Sin horario configurado; se usa el interruptor manual.",
      today: "Sin horario específico",
    };
  }

  const { dayOfWeek, time } = getBoliviaTimeParts();
  const todaySchedule = schedules.find((s) => s.dayOfWeek === dayOfWeek);
  const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

  if (!todaySchedule || todaySchedule.isClosed) {
    return {
      open: false,
      reason: `${merchant.name.replace(/^\[DEMO\]\s*/i, "")} no atiende hoy (${dayNames[dayOfWeek]}).`,
      today: "Cerrado todo el día",
    };
  }

  const within = isTimeWithin(time, todaySchedule.openTime, todaySchedule.closeTime);
  return {
    open: within,
    reason: within
      ? `${merchant.name.replace(/^\[DEMO\]\s*/i, "")} está abierto (${todaySchedule.openTime} a ${todaySchedule.closeTime}).`
      : `${merchant.name.replace(/^\[DEMO\]\s*/i, "")} está fuera de horario (${todaySchedule.openTime} a ${todaySchedule.closeTime}).`,
    today: `${todaySchedule.openTime} a ${todaySchedule.closeTime}`,
  };
}

async function resolveCustomer(
  context: OrderToolContext,
  phone?: string
): Promise<{
  id: string;
  phone: string;
  name: string | null;
  savedLatitude: number | null;
  savedLongitude: number | null;
  lastLocationLabel: string | null;
} | null> {
  if (context.customerId) {
    return prisma.customer.findUnique({
      where: { id: context.customerId },
      select: {
        id: true,
        phone: true,
        name: true,
        savedLatitude: true,
        savedLongitude: true,
        lastLocationLabel: true,
      },
    });
  }

  if (!phone) return null;

  const rawDigits = phone.replace(/\D/g, "");
  const e164 = rawDigits.startsWith("591") ? `+${rawDigits}` : `+591${rawDigits}`;

  let customer = await prisma.customer.findFirst({
    where: {
      OR: [{ phone }, { phone: rawDigits }, { phone: e164 }],
    },
    select: {
      id: true,
      phone: true,
      name: true,
      savedLatitude: true,
      savedLongitude: true,
      lastLocationLabel: true,
    },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        phone: e164,
        name: `Cliente WhatsApp (+${rawDigits})`,
      },
      select: {
        id: true,
        phone: true,
        name: true,
        savedLatitude: true,
        savedLongitude: true,
        lastLocationLabel: true,
      },
    });
  }

  return customer;
}

// =================================================================
// COTIZACIÓN
// =================================================================

export async function createOrderQuote(input: CreateQuoteInput, context: OrderToolContext) {
  try {
    // Los canales sin identidad/confirmación verificable no pueden generar
    // cotizaciones de pedidos reales. El flujo oficial es WhatsApp.
    if (context.source === "WEBCHAT" || context.source === "PUBLIC") {
      return {
        error:
          "Por seguridad, los pedidos se cotizan y confirman únicamente por WhatsApp. " +
          "Escribe al WhatsApp oficial de TropiGO para completar tu pedido.",
      };
    }

    if (!input.comercio || !input.comercio.trim()) {
      return { error: "Debe indicar el comercio o restaurante donde se realiza el pedido." };
    }
    if (!Array.isArray(input.items) || input.items.length === 0) {
      return { error: "Debe incluir al menos un producto con su cantidad." };
    }
    if (!input.direccionEntrega || !input.direccionEntrega.trim()) {
      return { error: "Debe indicar la dirección o ubicación de entrega en Ivirgarzama." };
    }

    const customer = await resolveCustomer(context);
    if (!customer) {
      return {
        error:
          "No se pudo identificar al cliente de la conversación. Solicita que escriba desde su WhatsApp registrado.",
      };
    }

    const allMerchants = await prisma.merchant.findMany({
      include: { city: true },
    });
    const merchant = matchUnique(allMerchants, input.comercio, (m) =>
      m.name.replace(/^\[DEMO\]\s*/i, "")
    );

    if (!merchant) {
      return {
        error: `No encontramos el comercio '${input.comercio}' de forma inequívoca. Comercios registrados: ${allMerchants
          .map((m) => m.name.replace(/^\[DEMO\]\s*/i, ""))
          .join(", ")}`,
      };
    }

    const openState = await isMerchantOpenNow(merchant);
    if (!openState.open) {
      return {
        error: `${openState.reason} No se puede cotizar un pedido a un comercio cerrado.`,
        comercioAbierto: false,
      };
    }

    const products = await prisma.product.findMany({
      where: { merchantId: merchant.id },
      include: {
        variants: true,
        optionGroups: { include: { items: true } },
      },
    });

    const snapshot: QuoteSnapshotItem[] = [];
    let subtotal = 0;

    for (const requested of input.items) {
      const qty = Math.max(1, Math.floor(Number(requested.cantidad) || 1));
      if (qty > 99) {
        return { error: "La cantidad máxima por producto es 99 unidades." };
      }

      const product = matchUnique(products, requested.producto, (p) =>
        p.name.replace(/^\[DEMO\]\s*/i, "")
      );

      if (!product) {
        return {
          error: `El producto '${requested.producto}' no existe o es ambiguo en el catálogo de ${merchant.name.replace(
            /^\[DEMO\]\s*/i,
            ""
          )}.`,
        };
      }

      if (!product.isAvailable) {
        return {
          error: `El producto '${product.name.replace(
            /^\[DEMO\]\s*/i,
            ""
          )}' está temporalmente agotado. Elige otro producto del catálogo.`,
        };
      }

      let unitPrice = product.price;
      let variantName: string | null = null;

      if (requested.variante && requested.variante.trim()) {
        const variant = matchUnique(product.variants, requested.variante, (v) => v.name);
        if (!variant) {
          return {
            error: `La variante '${requested.variante}' no existe para '${product.name.replace(
              /^\[DEMO\]\s*/i,
              ""
            )}'. Variantes disponibles: ${product.variants.map((v) => v.name).join(", ") || "ninguna"}.`,
          };
        }
        if (!variant.isAvailable) {
          return { error: `La variante '${variant.name}' está agotada.` };
        }
        unitPrice = variant.finalPrice;
        variantName = variant.name;
      }

      const selectedOptions: string[] = [];
      let optionsExtra = 0;

      for (const group of product.optionGroups) {
        const requestedOptions = (requested.opciones || []).filter(Boolean);
        const selected = group.items.filter((item) =>
          requestedOptions.some(
            (opt) =>
              normalizeText(item.name) === normalizeText(opt) ||
              normalizeText(item.name).includes(normalizeText(opt))
          )
        );

        if (group.isRequired && selected.length < Math.max(1, group.minSelect)) {
          return {
            error: `El grupo '${group.name}' es obligatorio. Debes elegir al menos ${Math.max(
              1,
              group.minSelect
            )} opción(es): ${group.items.map((i) => i.name).join(", ")}.`,
          };
        }

        if (selected.length < group.minSelect) {
          return {
            error: `Debes elegir al menos ${group.minSelect} opción(es) del grupo '${group.name}'.`,
          };
        }

        if (selected.length > group.maxSelect) {
          return {
            error: `Puedes elegir como máximo ${group.maxSelect} opción(es) del grupo '${group.name}'.`,
          };
        }

        for (const option of selected) {
          selectedOptions.push(option.name);
          optionsExtra += option.additionalPrice;
        }
      }

      const requestedOptions = (requested.opciones || []).filter(Boolean);
      const allOptionNames = product.optionGroups.flatMap((g) => g.items.map((i) => i.name));
      for (const requestedOption of requestedOptions) {
        const exists = allOptionNames.some(
          (name) =>
            normalizeText(name) === normalizeText(requestedOption) ||
            normalizeText(name).includes(normalizeText(requestedOption))
        );
        if (!exists) {
          return {
            error: `La opción '${requestedOption}' no existe para '${product.name.replace(
              /^\[DEMO\]\s*/i,
              ""
            )}'. Opciones disponibles: ${allOptionNames.join(", ") || "ninguna"}.`,
          };
        }
      }

      unitPrice = round2(unitPrice + optionsExtra);
      const subtotalItem = round2(unitPrice * qty);
      subtotal = round2(subtotal + subtotalItem);

      snapshot.push({
        productId: product.id,
        productName: product.name.replace(/^\[DEMO\]\s*/i, ""),
        unitPrice,
        quantity: qty,
        subtotal: subtotalItem,
        variantName,
        options: selectedOptions,
        specialInstructions: requested.notas?.trim() || null,
      });
    }

    // Si el cliente dio una zona explícita, se usa esa zona y no se sustituye por otra.
    // Si no la dio, se intenta resolver a partir de la dirección completa.
    const zoneQuery = (input.zonaDestino || input.direccionEntrega || "").trim();
    const zoneLookup = await findActiveZoneForQuery(zoneQuery);
    const zone = zoneLookup.zone;

    if (!zone) {
      const available = zoneLookup.zones.map((z) => ({
        id: z.id,
        nombre: z.name,
        descripcion: z.description,
        tarifaDeliveryBs: z.baseDeliveryCost,
        tiempoEstimadoMinutos: z.estimatedMinutes,
      }));

      return {
        requiereZona: true,
        error: zoneLookup.ambiguous
          ? "La zona indicada coincide con más de una zona de cobertura. Pide al cliente que precise el barrio exacto antes de continuar."
          : "No se pudo determinar una zona de cobertura oficial para esa dirección. Solicita al cliente la zona o barrio exacto.",
        zonasDisponibles: available,
      };
    }

    const deliveryFeeBase = round2(zone.baseDeliveryCost);

    // -----------------------------------------------------------------
    // Distancia real estimada desde el centro de Ivirgarzama (Plaza
    // Principal) hasta el cliente. Si el cliente no compartió GPS, se usa
    // la última ubicación guardada en su perfil. Sin coordenadas no se
    // inventan kilómetros: se mantiene la tarifa de la zona.
    // -----------------------------------------------------------------
    const deliveryDistance = await calcularDeliveryDesdeCentro({
      latitud: input.latitud,
      longitud: input.longitud,
      customerId: customer.id,
    });

    const distanceKm = deliveryDistance?.distanceKm ?? null;
    const distanceSurcharge = deliveryDistance?.surcharge ?? 0;
    const deliveryFee = round2(deliveryFeeBase + distanceSurcharge);
    const includedKm = deliveryDistance?.includedKm ?? 2;
    const perKmFee = deliveryDistance?.perKmFee ?? 0;
    const centroNombre =
      deliveryDistance?.centerName ?? "Plaza Principal de Ivirgarzama";

    // Si el cliente compartió una ubicación nueva, se guarda en su perfil
    // para no pedírsela otra vez en el siguiente mensaje.
    if (
      typeof input.latitud === "number" &&
      Number.isFinite(input.latitud) &&
      typeof input.longitud === "number" &&
      Number.isFinite(input.longitud)
    ) {
      await prisma.customer
        .update({
          where: { id: customer.id },
          data: {
            savedLatitude: input.latitud,
            savedLongitude: input.longitud,
          },
        })
        .catch(() => {});
    }

    const loyaltyDiscount = await getLoyaltyDiscountForQuote(
      customer.id,
      subtotal,
      deliveryFee
    );
    const discountAmount = loyaltyDiscount.discountAmount;
    const totalAmount = round2(
      Math.max(0, subtotal + deliveryFee - discountAmount)
    );
    const paymentMethod = normalizePaymentMethodCode(input.metodoPago);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const etaMinutos = distanceKm != null
      ? Math.max(zone.estimatedMinutes, estimarTiempoMinutos(distanceKm))
      : zone.estimatedMinutes;

    const distanciaInfo: Record<string, unknown> = {
      distanciaKm: distanceKm,
      distanciaLineaRectaKm: deliveryDistance?.straightKm ?? null,
      tipoCalculo: distanceKm != null ? "ruta_estimada_gps" : "zonificacion_territorial",
      origenCalculo: deliveryDistance?.source ?? null,
      centroNombre,
      centroLatitud: deliveryDistance?.center.latitude ?? null,
      centroLongitud: deliveryDistance?.center.longitude ?? null,
      zonaNombre: zone.name,
      kmIncluidos: includedKm,
      recargoPorKmBs: perKmFee,
      recargoDistanciaBs: distanceSurcharge,
      tiempoEstimadoMinutos: etaMinutos,
    };

    const itemsListText = snapshot
      .map(
        (item) =>
          `• ${item.quantity}x *${item.productName}*${
            item.variantName ? ` (${item.variantName})` : ""
          }${item.options.length ? ` + ${item.options.join(", ")}` : ""} = ${item.subtotal.toFixed(
            2
          )} Bs.${item.specialInstructions ? ` _(Nota: ${item.specialInstructions})_` : ""}`
      )
      .join("\n");

    const resumenTexto =
      `📋 *RESUMEN DE TU PEDIDO - TROPIGO*\n` +
      `🏪 *Comercio:* ${merchant.name.replace(/^\[DEMO\]\s*/i, "")}\n\n` +
      `*Detalle de productos:*\n${itemsListText}\n\n` +
      `💵 *Subtotal productos:* ${subtotal.toFixed(2)} Bs.\n` +
      `🛵 *Costo de envío:* ${deliveryFee.toFixed(2)} Bs. (${zone.name})\n` +
      (distanceSurcharge > 0
        ? `📏 *Recargo por distancia desde ${centroNombre}:* ${distanceSurcharge.toFixed(2)} Bs. (${formatoDistanciaKm(
            distanceKm
          )}, incluidos ${includedKm.toFixed(1)} km)\n`
        : "") +
      (distanceKm != null
        ? `📏 *Distancia desde ${centroNombre}:* ${formatoDistanciaKm(distanceKm)} por ruta\n`
        : "") +
      (discountAmount > 0
        ? `🎁 *Premio de fidelidad:* -${discountAmount.toFixed(2)} Bs. (${loyaltyDiscount.rewardDescription})\n`
        : "") +
      `📍 *Dirección de entrega:* ${input.direccionEntrega}${
        input.referencia ? ` (Ref: ${input.referencia})` : ""
      }\n` +
      `⏱️ *Tiempo estimado:* ~${etaMinutos} minutos\n` +
      `💳 *Método de pago:* ${paymentMethodLabel(paymentMethod)}\n` +
      `💰 *TOTAL A PAGAR:* *${totalAmount.toFixed(2)} Bs.*\n\n` +
      `⚠️ *¿Confirmas tu pedido por ${totalAmount.toFixed(
        2
      )} Bs.?* Responde con *"Sí, confirmo"* para enviarlo a cocina, o dime si deseas modificar algo.\n` +
      `⏳ Esta cotización es válida por 15 minutos.`;

    // Una conversación solo puede tener una cotización vigente. Al preparar un
    // nuevo resumen, las cotizaciones anteriores dejan de ser confirmables.
    await prisma.orderQuote.updateMany({
      where: {
        customerId: customer.id,
        status: "PENDIENTE",
        ...(context.conversationId
          ? { conversationId: context.conversationId }
          : { conversationId: null }),
      },
      data: { status: "CANCELADA" },
    });

    const quote = await prisma.orderQuote.create({
      data: {
        token: crypto.randomUUID(),
        customerId: customer.id,
        conversationId: context.conversationId || null,
        merchantId: merchant.id,
        deliveryZoneId: zone.id,
        itemsJson: JSON.stringify(snapshot),
        subtotal,
        deliveryFee,
        discountAmount,
        loyaltyRewardApplied: loyaltyDiscount.applied,
        totalAmount,
        paymentMethod,
        distanceKm,
        distanceSurcharge,
        deliveryAddressText: input.direccionEntrega.trim(),
        referencePoint: input.referencia?.trim() || null,
        latitude: typeof input.latitud === "number" ? input.latitud : null,
        longitude: typeof input.longitud === "number" ? input.longitud : null,
        customerNotes: input.notasCliente?.trim() || null,
        status: "PENDIENTE",
        expiresAt,
      },
    });

    return {
      resumenListo: true,
      requiereConfirmacionExplicita: true,
      puedeRegistrar: false,
      quoteId: quote.id,
      token: quote.token,
      expiraEn: expiresAt.toISOString(),
      comercioId: merchant.id,
      comercioNombre: merchant.name.replace(/^\[DEMO\]\s*/i, ""),
      items: snapshot.map((item) => ({
        productId: item.productId,
        nombre: item.productName,
        cantidad: item.quantity,
        precioUnitario: item.unitPrice,
        subtotalItem: item.subtotal,
        variante: item.variantName,
        opciones: item.options,
        notas: item.specialInstructions,
      })),
      subtotalBs: subtotal,
      costoEnvioBs: deliveryFee,
      recargoDistanciaBs: distanceSurcharge,
      distanciaKm: distanceKm,
      descuentoFidelidadBs: discountAmount,
      premioFidelidadAplicado: loyaltyDiscount.applied,
      fidelidad: loyaltyDiscount.summary
        ? {
            sellos: loyaltyDiscount.summary.stamps,
            sellosParaPremio: loyaltyDiscount.summary.stampsNeeded,
            premioDisponible: loyaltyDiscount.summary.rewardAvailable,
            premioDescripcion: loyaltyDiscount.summary.rewardDescription,
            codigo: loyaltyDiscount.summary.code,
            urlTarjeta: loyaltyDiscount.summary.qrUrl,
          }
        : null,
      totalBs: totalAmount,
      zonaNombre: zone.name,
      zonaId: zone.id,
      direccionEntrega: input.direccionEntrega,
      referencia: input.referencia || null,
      latitud: input.latitud ?? null,
      longitud: input.longitud ?? null,
      metodoPago: paymentMethod,
      distanciaInfo,
      resumenTexto,
      instruccionParaAsistente:
        `Muestra este resumen al cliente y pídele confirmación explícita. ` +
        `Solo si el cliente responde afirmativamente, invoca 'registrar_pedido' con quoteId='${quote.id}'. ` +
        `NUNCA registres el pedido sin confirmación explícita.`,
    };
  } catch (error: any) {
    console.error("[OrderService:createOrderQuote] Error:", error);
    return { error: `Error al preparar el resumen del pedido: ${error.message}` };
  }
}

// =================================================================
// CONFIRMACIÓN Y CREACIÓN ATÓMICA
// =================================================================

async function getNextOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
  // Una sola sentencia atómica: inserta el contador si no existe y, si existe,
  // lo incrementa bajo el lock de fila de PostgreSQL. Además, nunca queda por
  // debajo del mayor TRP-XXXX ya presente en la tabla Order.
  const rows = await tx.$queryRaw<Array<{ value: number }>>`
    INSERT INTO "OrderCounter" ("id", "value", "updatedAt")
    VALUES (
      'orders',
      COALESCE((
        SELECT MAX(CAST(SUBSTRING("orderNumber" FROM 5) AS INTEGER))
        FROM "Order"
        WHERE "orderNumber" ~ '^TRP-[0-9]+$'
      ), 1041) + 1,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("id") DO UPDATE
    SET "value" = GREATEST(
          "OrderCounter"."value",
          COALESCE((
            SELECT MAX(CAST(SUBSTRING("orderNumber" FROM 5) AS INTEGER))
            FROM "Order"
            WHERE "orderNumber" ~ '^TRP-[0-9]+$'
          ), 1041)
        ) + 1,
        "updatedAt" = CURRENT_TIMESTAMP
    RETURNING "value"
  `;

  const nextValue = Number(rows[0]?.value);
  if (!Number.isFinite(nextValue) || nextValue <= 0) {
    throw new Error("No se pudo generar el número correlativo del pedido.");
  }

  return `TRP-${nextValue}`;
}

async function recalculateSnapshot(
  quote: {
    merchantId: string;
    itemsJson: string;
  }
): Promise<{ ok: true; items: QuoteSnapshotItem[]; subtotal: number } | { ok: false; error: string }> {
  let snapshot: QuoteSnapshotItem[] = [];
  try {
    snapshot = JSON.parse(quote.itemsJson);
  } catch {
    return { ok: false, error: "La cotización contiene un detalle de productos inválido." };
  }

  let subtotal = 0;

  for (const item of snapshot) {
    const product = await prisma.product.findFirst({
      where: { id: item.productId, merchantId: quote.merchantId },
      include: {
        variants: true,
        optionGroups: { include: { items: true } },
      },
    });

    if (!product || !product.isAvailable) {
      return {
        ok: false,
        error: `El producto '${item.productName}' ya no está disponible. Prepara un nuevo resumen.`,
      };
    }

    let unitPrice = product.price;

    if (item.variantName) {
      const variant = product.variants.find(
        (v) => normalizeText(v.name) === normalizeText(item.variantName || "")
      );
      if (!variant || !variant.isAvailable) {
        return {
          ok: false,
          error: `La variante '${item.variantName}' ya no está disponible. Prepara un nuevo resumen.`,
        };
      }
      unitPrice = variant.finalPrice;
    }

    let optionsExtra = 0;
    for (const optionName of item.options || []) {
      const option = product.optionGroups
        .flatMap((group) => group.items)
        .find((candidate) => normalizeText(candidate.name) === normalizeText(optionName));
      if (!option) {
        return {
          ok: false,
          error: `La opción '${optionName}' ya no está disponible. Prepara un nuevo resumen.`,
        };
      }
      optionsExtra += option.additionalPrice;
    }

    const recalculatedUnitPrice = round2(unitPrice + optionsExtra);
    const recalculatedSubtotal = round2(recalculatedUnitPrice * item.quantity);

    if (
      Math.abs(recalculatedUnitPrice - item.unitPrice) > 0.009 ||
      Math.abs(recalculatedSubtotal - item.subtotal) > 0.009
    ) {
      return {
        ok: false,
        error:
          "El precio de uno de los productos cambió desde que se preparó el resumen. " +
          "Por seguridad, prepara un nuevo resumen y solicita confirmación nuevamente.",
      };
    }

    subtotal = round2(subtotal + recalculatedSubtotal);
  }

  return { ok: true, items: snapshot, subtotal };
}

export async function confirmAndCreateOrder(
  input: { quoteId: string; token?: string; customerNotes?: string },
  context: OrderToolContext
) {
  try {
    if (context.source === "WEBCHAT" || context.source === "PUBLIC") {
      return {
        exitoso: false,
        error:
          "Por seguridad, los pedidos se confirman únicamente por WhatsApp. " +
          "Escribe al WhatsApp oficial de TropiGO para completar tu pedido.",
      };
    }

    const explicitlyConfirmed =
      context.confirmationVerified === true ||
      (context.source === "CRM" && context.operatorConfirmed === true);

    if (!explicitlyConfirmed) {
      return {
        exitoso: false,
        error:
          "No se puede registrar el pedido sin confirmación explícita del cliente. " +
          "Muestra el resumen y espera una respuesta afirmativa clara.",
      };
    }

    if (!input.quoteId) {
      return {
        exitoso: false,
        error:
          "Falta el identificador de la cotización (quoteId). Primero debes preparar el resumen del pedido.",
      };
    }

    const quote = await prisma.orderQuote.findFirst({
      where: {
        id: input.quoteId,
        ...(input.token ? { token: input.token } : {}),
      },
      include: {
        customer: true,
        merchant: true,
        deliveryZone: true,
        order: {
          include: {
            items: true,
            statusHistory: { orderBy: { createdAt: "asc" } },
          },
        },
      },
    });

    if (!quote) {
      return { exitoso: false, error: "La cotización no existe o no pertenece a esta conversación." };
    }

    if (context.customerId && quote.customerId !== context.customerId) {
      return { exitoso: false, error: "La cotización pertenece a otro cliente." };
    }

    if (context.conversationId && quote.conversationId && quote.conversationId !== context.conversationId) {
      return { exitoso: false, error: "La cotización pertenece a otra conversación." };
    }

    if (quote.orderId && quote.order) {
      return {
        exitoso: true,
        duplicado: true,
        orderId: quote.order.id,
        orderNumber: quote.order.orderNumber,
        subtotalBs: quote.order.subtotal,
        costoEnvioBs: quote.order.deliveryFee,
        totalBs: quote.order.totalAmount,
        mensajeConfirmacion: `Tu pedido ${quote.order.orderNumber} ya estaba registrado. No se creó un duplicado.`,
      };
    }

    if (quote.status !== "PENDIENTE") {
      return {
        exitoso: false,
        error: `La cotización ya no está disponible (estado: ${quote.status}). Prepara un nuevo resumen.`,
      };
    }

    if (quote.expiresAt <= new Date()) {
      await prisma.orderQuote.updateMany({
        where: { id: quote.id, status: "PENDIENTE" },
        data: { status: "EXPIRADA" },
      });
      return {
        exitoso: false,
        error: "La cotización expiró. Prepara un nuevo resumen y solicita confirmación nuevamente.",
      };
    }

    const openState = await isMerchantOpenNow(quote.merchant);
    if (!openState.open) {
      return { exitoso: false, error: openState.reason };
    }

    const recalculated = await recalculateSnapshot(quote);
    if (!recalculated.ok) {
      await prisma.orderQuote.updateMany({
        where: { id: quote.id, status: "PENDIENTE" },
        data: { status: "EXPIRADA" },
      });
      return { exitoso: false, error: recalculated.error };
    }

    const result = await prisma.$transaction(async (tx) => {
      const claimed = await tx.orderQuote.updateMany({
        where: { id: quote.id, status: "PENDIENTE" },
        data: { status: "PROCESANDO" },
      });

      if (claimed.count !== 1) {
        const current = await tx.orderQuote.findUnique({
          where: { id: quote.id },
          include: {
            order: {
              include: {
                items: true,
                statusHistory: { orderBy: { createdAt: "asc" } },
              },
            },
          },
        });
        if (current?.order) {
          return { order: current.order, duplicate: true };
        }
        throw new Error("La cotización ya fue procesada por otra solicitud.");
      }

      const orderNumber = await getNextOrderNumber(tx);

      let discountAmount = 0;
      let loyaltyRewardApplied = false;

      if (quote.loyaltyRewardApplied) {
        const loyaltySettings = await getLoyaltySettings(tx);
        const loyaltyCustomer = await tx.customer.findUnique({
          where: { id: quote.customerId },
          select: { loyaltyStamps: true },
        });

        if (
          !loyaltySettings.enabled ||
          !loyaltyCustomer ||
          loyaltyCustomer.loyaltyStamps < loyaltySettings.stampsNeeded
        ) {
          throw new Error(
            "El premio de fidelidad ya fue utilizado o no está disponible. Prepara un nuevo resumen sin el premio."
          );
        }

        loyaltyRewardApplied = true;
        discountAmount = round2(
          Math.min(
            Math.max(0, quote.discountAmount || 0),
            recalculated.subtotal + quote.deliveryFee
          )
        );
      }

      const totalAmount = round2(
        Math.max(0, recalculated.subtotal + quote.deliveryFee - discountAmount)
      );

      const order = await tx.order.create({
        data: {
          orderNumber,
          cityId: quote.deliveryZone.cityId || quote.merchant.cityId || null,
          customerId: quote.customerId,
          merchantId: quote.merchantId,
          deliveryZoneId: quote.deliveryZoneId,
          orderType: "DELIVERY",
          itemsJson: JSON.stringify(recalculated.items),
          subtotal: recalculated.subtotal,
          deliveryFee: quote.deliveryFee,
          discountAmount,
          loyaltyRewardApplied,
          totalAmount,
          paymentMethod: quote.paymentMethod,
          paymentStatus: "PENDIENTE",
          distanceKm: quote.distanceKm,
          distanceSurcharge: quote.distanceSurcharge,
          status: "RECIBIDO",
          deliveryAddressText: quote.deliveryAddressText,
          referencePoint: quote.referencePoint,
          latitude: quote.latitude,
          longitude: quote.longitude,
          customerNotes: input.customerNotes?.trim() || quote.customerNotes || null,
          items: {
            create: recalculated.items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              subtotal: item.subtotal,
              variantName: item.variantName,
              optionsSnapshotJson: item.options.length ? JSON.stringify(item.options) : null,
              specialInstructions: item.specialInstructions,
            })),
          },
          statusHistory: {
            create: {
              toStatus: "RECIBIDO",
              comment:
                "Pedido registrado por el Asistente IA de WhatsApp tras confirmación explícita del cliente",
            },
          },
        },
        include: {
          items: true,
          statusHistory: { orderBy: { createdAt: "asc" } },
        },
      });

      if (loyaltyRewardApplied) {
        const reservation = await reserveLoyaltyReward(tx, {
          customerId: quote.customerId,
          orderId: order.id,
          orderNumber: order.orderNumber,
        });

        if (!reservation.reserved) {
          throw new Error(
            reservation.reason ||
              "El premio de fidelidad ya no está disponible. Prepara un nuevo resumen."
          );
        }
      }

      await tx.orderQuote.update({
        where: { id: quote.id },
        data: {
          status: "CONSUMIDA",
          consumedAt: new Date(),
          orderId: order.id,
        },
      });

      await tx.customer.update({
        where: { id: quote.customerId },
        data: { totalOrders: { increment: 1 } },
      });

      await tx.activityLog.create({
        data: {
          action: "ORDER_CREATED_WHATSAPP",
          entityName: "Order",
          entityId: order.id,
          provider: "tropigo_ai",
          channel: context.source === "CRM" ? "system" : "whatsapp",
          status: "success",
          detailsJson: JSON.stringify({
            orderNumber: order.orderNumber,
            quoteId: quote.id,
            totalAmount,
            discountAmount,
            loyaltyRewardApplied,
            merchant: quote.merchant.name,
            customerId: quote.customerId,
          }),
        },
      });

      return { order, duplicate: false };
    }, { timeout: 20000, maxWait: 10000 });

    const order = result.order;
    const merchantName = quote.merchant.name.replace(/^\[DEMO\]\s*/i, "");
    const appUrl = getAppUrl();
    const urlSeguimiento = `${appUrl}/seguimiento/${order.id}`;
    const urlPago = `${appUrl}/pagar/${order.id}`;
    const etaMinutos =
      order.distanceKm != null
        ? Math.max(
            quote.deliveryZone.estimatedMinutes,
            estimarTiempoMinutos(order.distanceKm)
          )
        : quote.deliveryZone.estimatedMinutes;

    const mensajeConfirmacion =
      `🎉 *¡TU PEDIDO HA SIDO CONFIRMADO CON ÉXITO!*\n\n` +
      `🆔 *Número de pedido:* *${order.orderNumber}*\n` +
      `🏪 *Comercio:* ${merchantName}\n` +
      `📦 *Estado:* Recibido (enviado a cocina)\n` +
      `💰 *Total a pagar:* *${order.totalAmount.toFixed(2)} Bs.* (${paymentMethodLabel(
        order.paymentMethod
      )})\n` +
      `📍 *Destino:* ${order.deliveryAddressText}${
        order.referencePoint ? ` (Ref: ${order.referencePoint})` : ""
      }\n` +
      `🛵 *Zona:* ${quote.deliveryZone.name}\n` +
      (order.distanceKm != null
        ? `📏 *Distancia estimada:* ${formatoDistanciaKm(order.distanceKm)} por ruta\n`
        : "") +
      `⏱️ *Tiempo estimado de entrega:* ~${etaMinutos} minutos\n\n` +
      `🗺️ *Sigue tu pedido en el mapa:*\n${urlSeguimiento}\n\n` +
      `💳 *Paga con QR, Altoke, Yape, ZAS o efectivo:*\n${urlPago}\n\n` +
      `También puedes escribir:\n` +
      `👉 *"¿Cómo va mi pedido ${order.orderNumber}?"*`;

    // Sincronizar con Google Calendar de forma opcional y no bloqueante
    createOrderCalendarEvent({
      orderNumber: order.orderNumber,
      customerName: quote.customer?.name || "Cliente",
      customerPhone: quote.customer?.phone,
      address: order.deliveryAddressText,
      total: order.totalAmount,
      items: recalculated.items.map((it: { quantity: number; productName: string }) => `${it.quantity}x ${it.productName}`).join(", "),
      estimatedDeliveryMinutes: etaMinutos,
    }).catch(() => {});

    return {
      exitoso: true,
      duplicado: result.duplicate,
      orderId: order.id,
      orderNumber: order.orderNumber,
      comercio: merchantName,
      subtotalBs: order.subtotal,
      costoEnvioBs: order.deliveryFee,
      recargoDistanciaBs: order.distanceSurcharge,
      distanciaKm: order.distanceKm,
      descuentoFidelidadBs: order.discountAmount,
      premioFidelidadAplicado: order.loyaltyRewardApplied,
      totalBs: order.totalAmount,
      tiempoEstimadoMinutos: etaMinutos,
      zonaNombre: quote.deliveryZone.name,
      urlSeguimiento,
      urlPago,
      mensajeConfirmacion: result.duplicate
        ? `Tu pedido ${order.orderNumber} ya estaba registrado. No se creó un duplicado.`
        : mensajeConfirmacion,
    };
  } catch (error: any) {
    console.error("[OrderService:confirmAndCreateOrder] Error:", error);
    return {
      exitoso: false,
      error: `Error al registrar el pedido en la base de datos: ${error.message}`,
    };
  }
}

// =================================================================
// CONSULTA DE ESTADO
// =================================================================

export async function getOrderForCustomer(code: string, context: OrderToolContext) {
  try {
    const orderNumber = String(code || "").trim().toUpperCase();
    if (!orderNumber) {
      return { encontrado: false, error: "Debe proporcionar el código del pedido (ej: TRP-1041)." };
    }

    const where: Prisma.OrderWhereInput = { orderNumber };

    if (context.customerId) {
      where.customerId = context.customerId;
    } else if (!["SUPERADMIN", "ADMIN", "OPERATOR"].includes(context.actorRole || "")) {
      return {
        encontrado: false,
        error: "No se pudo identificar al cliente para consultar este pedido.",
      };
    }

    const order = await prisma.order.findFirst({
      where,
      include: {
        merchant: true,
        assignedRider: true,
        deliveryZone: true,
        statusHistory: { orderBy: { createdAt: "asc" } },
        items: true,
      },
    });

    if (!order) {
      return {
        encontrado: false,
        codigoBuscado: orderNumber,
        mensaje: `No se encontró un pedido con el código "${orderNumber}" para este cliente.`,
      };
    }

    const statusTranslations: Record<string, string> = {
      RECIBIDO: "Recibido en sistema (esperando confirmación de cocina)",
      EN_PREPARACION: "En preparación en cocina",
      LISTO_RECOJO: "Listo para ser recogido por el repartidor",
      ASIGNADO: "Repartidor asignado",
      EN_CAMINO: "En camino a tu domicilio",
      ENTREGADO: "Entregado exitosamente",
      CANCELADO: "Cancelado",
    };

    const merchantName = order.merchant?.name.replace(/^\[DEMO\]\s*/i, "") || "Comercio de Ivirgarzama";
    const riderName = order.assignedRider?.name.replace(/^\[DEMO\]\s*/i, "") || "Por asignar";
    const appUrl = getAppUrl();
    const urlSeguimiento = `${appUrl}/seguimiento/${order.id}`;
    const urlPago = `${appUrl}/pagar/${order.id}`;

    return {
      tipo: "DELIVERY",
      encontrado: true,
      codigo: order.orderNumber,
      comercio: merchantName,
      estadoInterno: order.status,
      estadoLegible: statusTranslations[order.status] || order.status,
      totalBs: order.totalAmount,
      metodoPago: order.paymentMethod,
      estadoPago: order.paymentStatus,
      direccionEntrega: order.deliveryAddressText,
      distanciaKm: order.distanceKm,
      recargoDistanciaBs: order.distanceSurcharge,
      repartidor: riderName,
      telefonoRepartidor: order.assignedRider?.phone || null,
      urlSeguimiento,
      urlPago,
      creadoEn: order.createdAt.toISOString(),
      historial: order.statusHistory.map((entry) => ({
        estado: entry.toStatus,
        comentario: entry.comment,
        fecha: entry.createdAt.toISOString(),
      })),
      mensaje: `📦 Tu pedido ${order.orderNumber} (${merchantName}) se encuentra: *${
        statusTranslations[order.status] || order.status
      }*. Total: ${order.totalAmount.toFixed(2)} Bs. Repartidor: ${riderName}. ` +
        `🗺️ Seguimiento: ${urlSeguimiento} · 💳 Pago: ${urlPago}`,
    };
  } catch (error: any) {
    console.error("[OrderService:getOrderForCustomer] Error:", error);
    return { error: `Error al consultar el estado del pedido: ${error.message}` };
  }
}

// =================================================================
// MÁQUINA DE ESTADOS Y ASIGNACIÓN
// =================================================================

export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  RECIBIDO: ["EN_PREPARACION", "CANCELADO"],
  EN_PREPARACION: ["LISTO_RECOJO", "CANCELADO"],
  LISTO_RECOJO: ["ASIGNADO", "CANCELADO"],
  ASIGNADO: ["EN_CAMINO", "CANCELADO"],
  EN_CAMINO: ["ENTREGADO", "CANCELADO"],
  ENTREGADO: [],
  CANCELADO: [],
};

export function getAllowedNextStatuses(currentStatus: string): string[] {
  return ORDER_STATUS_TRANSITIONS[currentStatus] || [];
}

async function getActor(actorUserId: string) {
  const user = await prisma.user.findUnique({
    where: { id: actorUserId },
    include: { riderProfile: true, ownedMerchants: true },
  });
  if (!user || user.status !== "ACTIVE") {
    throw new OrderAccessError("El usuario no existe o está inactivo.");
  }
  return user;
}

export async function transitionOrderStatus(input: {
  orderId: string;
  nextStatus: string;
  actorUserId: string;
  comment?: string;
  cancellationReason?: string;
}) {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: { merchant: true, assignedRider: true },
  });

  if (!order) throw new OrderTransitionError("Pedido no encontrado.");

  const actor = await getActor(input.actorUserId);
  const isAdmin = ["SUPERADMIN", "ADMIN", "OPERATOR"].includes(actor.role);
  const isMerchantOwner =
    actor.role === "MERCHANT_OWNER" &&
    Boolean(order.merchantId) &&
    actor.ownedMerchants.some((merchant) => merchant.id === order.merchantId);
  const isAssignedRider =
    actor.role === "RIDER" &&
    Boolean(order.assignedRiderId) &&
    actor.riderProfile?.id === order.assignedRiderId;

  if (!isAdmin && !isMerchantOwner && !isAssignedRider) {
    throw new OrderAccessError("No tienes permiso para actualizar este pedido.");
  }

  if (order.status === input.nextStatus) {
    return order;
  }

  // ASIGNADO solo se establece mediante assignRiderToOrder, que valida
  // disponibilidad del repartidor y evita pedidos asignados sin conductor.
  if (input.nextStatus === "ASIGNADO") {
    throw new OrderTransitionError(
      "Para pasar a ASIGNADO debes usar la asignación de repartidor del CRM."
    );
  }

  if (input.nextStatus === "EN_CAMINO" && !order.assignedRiderId) {
    throw new OrderTransitionError(
      "No se puede pasar a EN_CAMINO un pedido sin repartidor asignado."
    );
  }

  const allowed = ORDER_STATUS_TRANSITIONS[order.status] || [];
  if (!allowed.includes(input.nextStatus)) {
    throw new OrderTransitionError(
      `Transición inválida: ${order.status} → ${input.nextStatus}. Permitidos: ${
        allowed.join(", ") || "ninguno"
      }.`
    );
  }

  if (isMerchantOwner) {
    const merchantAllowed = ["EN_PREPARACION", "LISTO_RECOJO", "CANCELADO"];
    if (!merchantAllowed.includes(input.nextStatus)) {
      throw new OrderAccessError("El comercio no puede realizar esa transición.");
    }
  }

  if (isAssignedRider) {
    const riderAllowed = ["EN_CAMINO", "ENTREGADO"];
    if (!riderAllowed.includes(input.nextStatus)) {
      throw new OrderAccessError("El repartidor no puede realizar esa transición.");
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const orderUpdated = await tx.order.update({
      where: { id: order.id },
      data: {
        status: input.nextStatus,
        ...(input.nextStatus === "CANCELADO"
          ? {
              cancellationReason: input.cancellationReason || input.comment || "Cancelado por operador",
              cancelledBy: input.actorUserId,
            }
          : {}),
      },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: input.nextStatus,
        changedByUserId: input.actorUserId,
        comment: input.comment || `Estado actualizado a ${input.nextStatus}`,
      },
    });

    if (input.nextStatus === "ENTREGADO") {
      await awardLoyaltyOnDelivery(tx, {
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        loyaltyRewardApplied: order.loyaltyRewardApplied,
        loyaltyStampsAwarded: order.loyaltyStampsAwarded,
      });
    }

    if (input.nextStatus === "CANCELADO") {
      await restoreLoyaltyOnCancellation(tx, {
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        loyaltyRewardApplied: order.loyaltyRewardApplied,
      });
    }

    if (input.nextStatus === "ENTREGADO" && order.assignedRiderId) {
      await tx.rider.update({
        where: { id: order.assignedRiderId },
        data: {
          isAvailable: true,
          totalDeliveries: { increment: 1 },
        },
      });
    }

    if (input.nextStatus === "CANCELADO" && order.assignedRiderId) {
      await tx.rider.update({
        where: { id: order.assignedRiderId },
        data: { isAvailable: true },
      });
    }

    await tx.activityLog.create({
      data: {
        userId: input.actorUserId,
        action: "ORDER_STATUS_CHANGED",
        entityName: "Order",
        entityId: order.id,
        provider: "crm",
        channel: "system",
        status: "success",
        detailsJson: JSON.stringify({
          orderNumber: order.orderNumber,
          fromStatus: order.status,
          toStatus: input.nextStatus,
          comment: input.comment || null,
        }),
      },
    });

    return orderUpdated;
  }, { timeout: 20000, maxWait: 10000 });

  // Asignación automática de repartidor cuando el pedido queda listo.
  // Es best-effort: si no hay rider disponible, el pedido permanece en
  // LISTO_RECOJO y el operador puede asignarlo manualmente.
  if (input.nextStatus === "LISTO_RECOJO") {
    await tryAutoAssignRider(order.id).catch((error) => {
      console.warn(
        `[OrderService] No se pudo auto-asignar rider al pedido ${order.orderNumber}:`,
        error?.message || error
      );
    });
  }

  return updated;
}

/**
 * Asigna el repartidor disponible con menos entregas al pedido LISTO_RECOJO.
 * Solo actúa si BusinessProfile.autoAssignRiders está activo.
 */
async function tryAutoAssignRider(orderId: string): Promise<void> {
  const business = await prisma.businessProfile.findFirst({
    select: { autoAssignRiders: true },
  });
  if (business && business.autoAssignRiders === false) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, assignedRiderId: true },
  });
  if (!order || order.status !== "LISTO_RECOJO" || order.assignedRiderId) return;

  const rider = await prisma.rider.findFirst({
    where: { isActive: true, isAvailable: true },
    orderBy: [{ totalDeliveries: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  if (!rider) return;

  const actor = await prisma.user.findFirst({
    where: {
      role: { in: ["SUPERADMIN", "ADMIN", "OPERATOR"] },
      status: "ACTIVE",
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!actor) return;

  await assignRiderToOrder({
    orderId,
    riderId: rider.id,
    actorUserId: actor.id,
  });
}

export async function assignRiderToOrder(input: {
  orderId: string;
  riderId: string;
  actorUserId: string;
}) {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: { merchant: true, assignedRider: true },
  });

  if (!order) throw new OrderTransitionError("Pedido no encontrado.");

  const actor = await getActor(input.actorUserId);
  if (!["SUPERADMIN", "ADMIN", "OPERATOR"].includes(actor.role)) {
    throw new OrderAccessError("No tienes permiso para asignar repartidores.");
  }

  if (!["LISTO_RECOJO", "ASIGNADO"].includes(order.status)) {
    throw new OrderTransitionError(
      `Solo se puede asignar un repartidor cuando el pedido está LISTO_RECOJO o ASIGNADO. Estado actual: ${order.status}.`
    );
  }

  if (order.assignedRiderId && order.assignedRiderId !== input.riderId) {
    throw new OrderTransitionError("El pedido ya está asignado a otro repartidor.");
  }

  const rider = await prisma.rider.findUnique({ where: { id: input.riderId } });
  if (!rider || !rider.isActive) {
    throw new OrderTransitionError("El repartidor no existe o está inactivo.");
  }
  if (!rider.isAvailable && order.assignedRiderId !== rider.id) {
    throw new OrderTransitionError("El repartidor no está disponible.");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        assignedRiderId: rider.id,
        status: "ASIGNADO",
      },
    });

    await tx.rider.update({
      where: { id: rider.id },
      data: { isAvailable: false },
    });

    if (order.status !== "ASIGNADO" || order.assignedRiderId !== rider.id) {
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: "ASIGNADO",
          changedByUserId: input.actorUserId,
          comment: `Repartidor ${rider.name.replace(/^\[DEMO\]\s*/i, "")} asignado`,
        },
      });
    }

    await tx.activityLog.create({
      data: {
        userId: input.actorUserId,
        action: "ORDER_RIDER_ASSIGNED",
        entityName: "Order",
        entityId: order.id,
        provider: "crm",
        channel: "system",
        status: "success",
        detailsJson: JSON.stringify({
          orderNumber: order.orderNumber,
          riderId: rider.id,
          riderName: rider.name,
        }),
      },
    });

    return updated;
  }, { timeout: 20000, maxWait: 10000 });
}
