import { prisma } from "../prisma";
import { WhatsAppAdapterFactory } from "./adapter-factory";
import { getAppUrl } from "../app-url";
import { parseRiderPaymentQr } from "../payments/rider";
import { paymentMethodLabel } from "../payments/types";
import {
  ensureMerchantAccessToken,
  ensureRiderAccessToken,
  merchantAccessUrl,
  riderAccessUrl,
} from "../access/tokens";

/**
 * Notificaciones por WhatsApp de TropiGO.
 *
 * Regla general: son "fire-and-forget". Nunca deben bloquear la creación de un
 * pedido ni romper una transición de estado. Si Meta no está configurado, el
 * error se registra en ActivityLog y el pedido sigue su curso normal.
 */

function toE164(phone?: string | null): string | null {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;
  const national = digits.startsWith("591") ? digits.slice(3) : digits;
  if (national.length < 7) return null;
  return `+591${national}`;
}

function money(value: number): string {
  return `${Number(value || 0).toFixed(2)} Bs.`;
}

function cleanMerchantName(name?: string | null): string {
  return String(name || "Comercio de Ivirgarzama").replace(/^\[DEMO\]\s*/i, "");
}

function cleanRiderName(name?: string | null): string {
  return String(name || "repartidor asignado").replace(/^\[DEMO\]\s*/i, "");
}

function orderItemsText(order: any): string {
  const items: any[] = Array.isArray(order.items) && order.items.length
    ? order.items
    : (() => {
        try {
          return JSON.parse(order.itemsJson || "[]");
        } catch {
          return [];
        }
      })();

  return items
    .map((item) => {
      const name = item.productName || item.name || "Producto";
      const variant = item.variantName ? ` (${item.variantName})` : "";
      const qty = Number(item.quantity || 1);
      const lineTotal = Number(
        item.subtotal ?? Number(item.unitPrice || item.price || 0) * qty
      );
      return `• ${qty}x ${name}${variant} — ${money(lineTotal)}`;
    })
    .join("\n");
}

async function logNotification(input: {
  action: string;
  orderId?: string;
  riderId?: string;
  merchantId?: string;
  status: "success" | "error" | "warning";
  recipient?: string | null;
  details?: Record<string, unknown>;
  errorText?: string;
}) {
  try {
    await prisma.activityLog.create({
      data: {
        action: input.action,
        entityName: input.orderId ? "Order" : input.riderId ? "Rider" : "Merchant",
        entityId: input.orderId || input.riderId || input.merchantId || null,
        provider: "whatsapp",
        channel: "whatsapp",
        status: input.status,
        detailsJson: JSON.stringify({
          recipient: input.recipient || null,
          ...(input.details || {}),
        }),
        errorText: input.errorText?.slice(0, 500) || null,
      },
    });
  } catch {
    // La auditoría nunca debe romper el flujo principal.
  }
}

async function fetchOrderForNotifications(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      assignedRider: true,
      merchant: { include: { owner: { select: { phone: true } } } },
      items: true,
    },
  });
}

function buildMerchantNewOrderMessage(order: any, url: string): string {
  const merchantName = cleanMerchantName(order.merchant?.name);
  const customerName = order.customer?.name || "Cliente";
  return (
    `🔔 *NUEVO PEDIDO TROPIGO ${order.orderNumber}*\n\n` +
    `🏪 *${merchantName}*\n` +
    `🧾 *Detalle:*\n${orderItemsText(order)}\n\n` +
    `💰 *Total a cobrar:* ${money(order.totalAmount)}\n` +
    `💳 *Pago:* ${paymentMethodLabel(order.paymentMethod)}\n` +
    `📍 *Entrega:* ${order.deliveryAddressText}${
      order.referencePoint ? ` (Ref: ${order.referencePoint})` : ""
    }\n` +
    `👤 *Cliente:* ${customerName} · ${order.customer?.phone || ""}\n\n` +
    `👉 *Toca aquí para aceptar el pedido y marcarlo "En cocina":*\n${url}`
  );
}

function buildRiderNewOrderMessage(order: any, url: string): string {
  const merchantName = cleanMerchantName(order.merchant?.name);
  const customerName = order.customer?.name || "Cliente";
  const merchantAddress = order.merchant?.address || "Ivirgarzama";
  return (
    `🛵 *NUEVA CARRERA TROPIGO ${order.orderNumber}*\n\n` +
    `📍 *Recoger en:* ${merchantName} — ${merchantAddress}\n` +
    `🏠 *Entregar a:* ${customerName} — ${order.deliveryAddressText}${
      order.referencePoint ? ` (Ref: ${order.referencePoint})` : ""
    }\n` +
    `💵 *Envío:* ${money(order.deliveryFee)}\n` +
    `💰 *Cobrar al cliente:* ${money(order.totalAmount)} (${paymentMethodLabel(
      order.paymentMethod
    )})\n\n` +
    `👉 *Toca aquí para aceptar y ver el mapa:*\n${url}`
  );
}

/**
 * Avisa al comercio que ingresó un pedido nuevo. Se envía una sola vez por
 * pedido (Order.merchantNotifiedAt evita duplicados).
 */
export async function notifyMerchantNewOrder(orderId: string): Promise<void> {
  try {
    const order = await fetchOrderForNotifications(orderId);
    if (!order?.merchant) return;

    const recipient = toE164(order.merchant.phone || order.merchant.owner?.phone);
    if (!recipient) {
      await logNotification({
        action: "WHATSAPP_MERCHANT_NEW_ORDER",
        orderId,
        merchantId: order.merchant.id,
        status: "warning",
        details: { reason: "merchant_without_phone", orderNumber: order.orderNumber },
      });
      return;
    }

    const token = await ensureMerchantAccessToken(order.merchant.id);
    if (!token) return;

    const claimed = await prisma.order.updateMany({
      where: { id: orderId, merchantNotifiedAt: null },
      data: { merchantNotifiedAt: new Date() },
    });
    if (claimed.count === 0) return;

    const adapter = await WhatsAppAdapterFactory.getAdapter().catch(() => null);
    if (!adapter) return;

    await adapter.sendMessage(
      recipient,
      buildMerchantNewOrderMessage(order, merchantAccessUrl(token))
    );

    await logNotification({
      action: "WHATSAPP_MERCHANT_NEW_ORDER",
      orderId,
      merchantId: order.merchant.id,
      status: "success",
      recipient,
      details: { orderNumber: order.orderNumber },
    });
  } catch (error: any) {
    console.warn(
      `[notifyMerchantNewOrder] No se pudo avisar al comercio del pedido ${orderId}:`,
      error?.message || error
    );
    await logNotification({
      action: "WHATSAPP_MERCHANT_NEW_ORDER",
      orderId,
      status: "error",
      errorText: error?.message || String(error),
    });
  }
}

/**
 * Avisa al repartidor asignado con los datos de recojo, entrega y su enlace de
 * acceso rápido. Se envía una sola vez por pedido.
 */
export async function notifyRiderNewOrder(orderId: string): Promise<void> {
  try {
    const order = await fetchOrderForNotifications(orderId);
    const rider = order?.assignedRider;
    if (!order || !rider) return;

    const recipient = toE164(rider.phone);
    if (!recipient) return;

    const token = await ensureRiderAccessToken(rider.id);
    if (!token) return;

    const claimed = await prisma.order.updateMany({
      where: { id: orderId, riderNotifiedAt: null },
      data: { riderNotifiedAt: new Date() },
    });
    if (claimed.count === 0) return;

    const adapter = await WhatsAppAdapterFactory.getAdapter().catch(() => null);
    if (!adapter) return;

    await adapter.sendMessage(
      recipient,
      buildRiderNewOrderMessage(order, riderAccessUrl(token))
    );

    await logNotification({
      action: "WHATSAPP_RIDER_NEW_ORDER",
      orderId,
      riderId: rider.id,
      status: "success",
      recipient,
      details: { orderNumber: order.orderNumber },
    });
  } catch (error: any) {
    console.warn(
      `[notifyRiderNewOrder] No se pudo avisar al repartidor del pedido ${orderId}:`,
      error?.message || error
    );
    await logNotification({
      action: "WHATSAPP_RIDER_NEW_ORDER",
      orderId,
      status: "error",
      errorText: error?.message || String(error),
    });
  }
}

/**
 * Envía al repartidor recién aprobado su enlace personal de acceso. Es la
 * alternativa sin contraseña al login tradicional.
 */
export async function notifyRiderApproved(riderId: string): Promise<void> {
  try {
    const rider = await prisma.rider.findUnique({ where: { id: riderId } });
    if (!rider) return;

    const recipient = toE164(rider.phone);
    if (!recipient) return;

    const token = await ensureRiderAccessToken(rider.id);
    if (!token) return;

    const adapter = await WhatsAppAdapterFactory.getAdapter().catch(() => null);
    if (!adapter) return;

    const message =
      `✅ *¡Tu registro en TropiGO fue aprobado!*\n\n` +
      `🛵 *${rider.name}*, ya puedes recibir pedidos y carreras en Ivirgarzama.\n\n` +
      `👉 *Abre tu panel aquí:*\n${riderAccessUrl(token)}\n\n` +
      `Guarda este enlace: no necesitas correo ni contraseña. ` +
      `Cada vez que tengas una carrera, te llegará un aviso a este mismo WhatsApp.`;

    await adapter.sendMessage(recipient, message);

    await logNotification({
      action: "WHATSAPP_RIDER_APPROVED",
      riderId: rider.id,
      status: "success",
      recipient,
      details: { riderName: rider.name },
    });
  } catch (error: any) {
    console.warn(
      `[notifyRiderApproved] No se pudo avisar al repartidor ${riderId}:`,
      error?.message || error
    );
    await logNotification({
      action: "WHATSAPP_RIDER_APPROVED",
      riderId,
      status: "error",
      errorText: error?.message || String(error),
    });
  }
}

/**
 * Envía una notificación por WhatsApp al cliente cuando cambia el estado de su pedido.
 * Esta función es completamente segura (fire-and-forget):
 * - No bloquea la respuesta al cliente ni al CRM.
 * - Captura y silencia cualquier error en el envío.
 * - Solo envía mensaje si el cliente cuenta con un número telefónico válido.
 *
 * Además avisa al comercio y al repartidor en los hitos que les corresponden.
 */
export async function sendOrderStatusNotification(
  orderOrId: string | { id: string },
  newStatus: string
): Promise<void> {
  try {
    const id = typeof orderOrId === "string" ? orderOrId : orderOrId?.id;
    if (!id) return;

    const order = await fetchOrderForNotifications(id);
    if (!order) return;

    const adapter = await WhatsAppAdapterFactory.getAdapter().catch(() => null);
    if (!adapter) return;

    const appUrl = getAppUrl();
    const trackingUrl = `${appUrl}/seguimiento/${order.id}`;
    const paymentUrl = `${appUrl}/pagar/${order.id}`;
    const orderNum = order.orderNumber;
    const riderName = cleanRiderName(order.assignedRider?.name);

    // -----------------------------------------------------------------
    // 1. Cliente
    // -----------------------------------------------------------------
    const recipient = toE164(order.customer?.phone);

    let messageText = "";
    let riderQrToSend: string | null = null;
    let riderQrCaption = "";

    switch (newStatus) {
      case "RECIBIDO":
        messageText =
          `✅ *TropiGO:* Tu pedido *${orderNum}* ha sido recibido con éxito.\n` +
          `Total: *${order.totalAmount.toFixed(2)} Bs.*\n` +
          `En unos momentos pasará a cocina. Puedes ver los detalles aquí: ${trackingUrl}`;
        break;

      case "EN_PREPARACION":
        messageText =
          `👨‍🍳 *TropiGO:* Tu pedido *${orderNum}* ya está en preparación en cocina. ¡Pronto estará listo para entrega!`;
        break;

      case "LISTO_RECOJO":
        messageText =
          `📦 *TropiGO:* Tu pedido *${orderNum}* está listo para ser recogido por nuestro equipo de entrega.`;
        break;

      case "ASIGNADO": {
        const riderQr = parseRiderPaymentQr(order.assignedRider?.paymentQrJson);
        messageText =
          `🛵 *TropiGO:* Tu pedido *${orderNum}* ha sido asignado al repartidor *${riderName}*.\n\n` +
          `📍 *Seguimiento en vivo:* ${trackingUrl}\n` +
          `💳 *Opciones de pago:* ${paymentUrl}\n\n` +
          (riderQr
            ? `💡 *Pago digital directo:* Puedes pagar al repartidor vía *${riderQr.label}* (${riderQr.accountName ? riderQr.accountName : "QR personal"}). Abre el enlace de pago o escanea su QR.`
            : `💡 Puedes pagar en efectivo contra entrega o con QR en el enlace de pago.`);
        break;
      }

      case "EN_CAMINO": {
        const riderQr = parseRiderPaymentQr(order.assignedRider?.paymentQrJson);
        messageText =
          `🚀 *TropiGO:* ¡Tu pedido *${orderNum}* ya está EN CAMINO!\n\n` +
          `🛵 *Repartidor:* ${riderName}\n` +
          `📍 *Sigue el viaje en tiempo real:* ${trackingUrl}\n` +
          `💵 *Total a pagar:* ${order.totalAmount.toFixed(2)} Bs.\n` +
          `💳 *Pagar con QR / Billetera:* ${paymentUrl}\n\n` +
          `_Al pagar con QR (Tigo Money, Yape, Altoke, ZAS o banco), envía la foto de tu comprobante a este chat para validarlo automáticamente._`;

        if (riderQr && riderQr.qrImage && riderQr.qrImage.startsWith("http")) {
          riderQrToSend = riderQr.qrImage;
          riderQrCaption = `QR de cobro de ${riderName} (${riderQr.label})`;
        }
        break;
      }

      case "ENTREGADO":
        messageText =
          `🎉 *TropiGO:* ¡Tu pedido *${orderNum}* fue entregado!\n\n` +
          `Muchas gracias por confiar en TropiGO. ¡Buen provecho! Recuerda que tus pedidos acumulan sellos en tu tarjeta de fidelidad. 🛵💨`;
        break;

      case "CANCELADO":
        messageText =
          `❌ *TropiGO:* Tu pedido *${orderNum}* ha sido cancelado.\n` +
          `Si tienes alguna consulta o necesitas ayuda, puedes responder directamente a este mensaje.`;
        break;

      default:
        // No enviar mensaje al cliente para otros estados intermedios.
        break;
    }

    if (messageText && recipient) {
      await adapter.sendMessage(recipient, messageText).catch((err) => {
        console.warn(`[sendOrderStatusNotification] Error al enviar mensaje a ${recipient}:`, err?.message || err);
      });
    }

    // Encuesta de satisfacción inmediata al entregar el pedido
    if (newStatus === "ENTREGADO" && recipient) {
      await adapter
        .sendInteractiveList(
          recipient,
          "Tu opinión nos importa ⭐",
          "¿Cómo calificarías tu experiencia con TropiGO en este pedido?",
          [
            {
              title: "Calificación del servicio",
              rows: [
                { id: `rate_5_${order.id}`, title: "⭐⭐⭐⭐⭐ Excelente", description: "Todo llegó a tiempo y en perfecto estado" },
                { id: `rate_4_${order.id}`, title: "⭐⭐⭐⭐ Muy bueno", description: "Buen servicio en general" },
                { id: `rate_3_${order.id}`, title: "⭐⭐⭐ Regular", description: "Puede mejorar en tiempo o entrega" },
                { id: `rate_2_${order.id}`, title: "⭐⭐ Malo", description: "Tuve inconvenientes con mi pedido" },
                { id: `rate_1_${order.id}`, title: "⭐ Muy malo", description: "Mala experiencia" },
              ],
            },
          ]
        )
        .catch((err) => {
          console.warn(`[sendOrderStatusNotification] No se pudo enviar encuesta a ${recipient}:`, err?.message || err);
        });
    }

    // Si hay imagen de QR del repartidor y URL pública, enviarla como apoyo
    if (riderQrToSend && recipient) {
      await adapter.sendImage(recipient, riderQrToSend, riderQrCaption).catch((err) => {
        console.warn(`[sendOrderStatusNotification] Error al enviar QR de cobro:`, err?.message || err);
      });
    }

    // -----------------------------------------------------------------
    // 2. Comercio: hitos que le importan a cocina.
    // -----------------------------------------------------------------
    const merchantRecipient = toE164(
      order.merchant?.phone || order.merchant?.owner?.phone
    );
    if (merchantRecipient && order.merchant) {
      let merchantMessage = "";
      switch (newStatus) {
        case "ASIGNADO":
          merchantMessage = `🛵 *${orderNum}:* Repartidor asignado: *${riderName}*. Ya puede pasar a recoger el pedido.`;
          break;
        case "EN_CAMINO":
          merchantMessage = `🚀 *${orderNum}:* El repartidor *${riderName}* recogió el pedido y ya va en camino al cliente.`;
          break;
        case "ENTREGADO":
          merchantMessage = `✅ *${orderNum}:* Pedido entregado al cliente. ¡Gracias por prepararlo!`;
          break;
        case "CANCELADO":
          merchantMessage = `❌ *${orderNum}:* El pedido fue cancelado. No lo prepares si aún está en cocina.`;
          break;
        default:
          break;
      }
      if (merchantMessage) {
        await adapter.sendMessage(merchantRecipient, merchantMessage).catch((err) => {
          console.warn(
            `[sendOrderStatusNotification] Error al avisar al comercio ${merchantRecipient}:`,
            err?.message || err
          );
        });
      }
    }

    // -----------------------------------------------------------------
    // 3. Repartidor: solo cancelaciones (el resto lo ve en su panel).
    // -----------------------------------------------------------------
    const riderRecipient = toE164(order.assignedRider?.phone);
    if (riderRecipient && newStatus === "CANCELADO") {
      await adapter
        .sendMessage(
          riderRecipient,
          `❌ *Carrera ${orderNum} cancelada.*\n` +
            `El pedido fue cancelado; no continúes al local. Si ya lo recogiste, contacta a un operador de TropiGO.`
        )
        .catch((err) => {
          console.warn(
            `[sendOrderStatusNotification] Error al avisar al repartidor ${riderRecipient}:`,
            err?.message || err
          );
        });
    }
  } catch (error) {
    console.error("[sendOrderStatusNotification] Error inesperado en notificación:", error);
  }
}
