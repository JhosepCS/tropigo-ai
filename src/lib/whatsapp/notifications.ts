import { prisma } from "../prisma";
import { WhatsAppAdapterFactory } from "./adapter-factory";
import { getAppUrl } from "../app-url";
import { parseRiderPaymentQr } from "../payments/rider";

/**
 * Envía una notificación por WhatsApp al cliente cuando cambia el estado de su pedido.
 * Esta función es completamente segura (fire-and-forget):
 * - No bloquea la respuesta al cliente ni al CRM.
 * - Captura y silencia cualquier error en el envío.
 * - Solo envía mensaje si el cliente cuenta con un número telefónico válido.
 */
export async function sendOrderStatusNotification(
  orderOrId: string | { id: string },
  newStatus: string
): Promise<void> {
  try {
    const id = typeof orderOrId === "string" ? orderOrId : orderOrId?.id;
    if (!id) return;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        assignedRider: true,
      },
    });

    if (!order || !order.customer?.phone) {
      return;
    }

    const adapter = await WhatsAppAdapterFactory.getAdapter().catch(() => null);
    if (!adapter) {
      return;
    }

    const recipient = order.customer.phone;
    const appUrl = getAppUrl();
    const trackingUrl = `${appUrl}/seguimiento/${order.id}`;
    const paymentUrl = `${appUrl}/pagar/${order.id}`;
    const orderNum = order.orderNumber;
    const riderName = order.assignedRider?.name?.replace(/^\[DEMO\]\s*/i, "") || "repartidor asignado";

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
        // No enviar mensaje para otros estados intermedios no críticos
        return;
    }

    if (messageText) {
      await adapter.sendMessage(recipient, messageText).catch((err) => {
        console.warn(`[sendOrderStatusNotification] Error al enviar mensaje a ${recipient}:`, err?.message || err);
      });
    }

    // Si hay imagen de QR del repartidor y URL pública, enviarla como apoyo
    if (riderQrToSend) {
      await adapter.sendImage(recipient, riderQrToSend, riderQrCaption).catch((err) => {
        console.warn(`[sendOrderStatusNotification] Error al enviar QR de cobro:`, err?.message || err);
      });
    }
  } catch (error) {
    console.error("[sendOrderStatusNotification] Error inesperado en notificación:", error);
  }
}
