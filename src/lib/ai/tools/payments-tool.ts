import { prisma } from "../../prisma";
import { getEnabledPaymentMethods } from "../../payments/service";
import { getAppUrl } from "../../app-url";
import { IAssistantTool } from "./types";

const ADMIN_ROLES = ["SUPERADMIN", "ADMIN", "OPERATOR"];

/**
 * Devuelve los métodos de pago configurados y los enlaces públicos de pago y
 * seguimiento. No expone imágenes QR en base64 ni credenciales: solo rutas
 * públicas que el cliente puede abrir.
 */
export const paymentMethodsTool: IAssistantTool = {
  name: "consultar_metodos_pago",
  description:
    "Consulta los métodos de pago habilitados por TropiGO (efectivo, QR Simple interbancario, Tigo Money, Altoke, Yape, ZAS y transferencia bancaria), " +
    "los datos de cuenta del negocio y los enlaces de pago y seguimiento de un pedido o carrera. " +
    "Úsala cuando el cliente pregunte cómo pagar o pida el QR/enlace de pago.",
  parameters: {
    type: "object",
    properties: {
      codigo: {
        type: "string",
        description:
          "Código opcional del pedido (TRP-XXXX) o carrera (VIAJE-XXXX) para devolver su enlace de pago y seguimiento.",
      },
    },
  },
  async execute(args: any, context?: any) {
    try {
      const methods = await getEnabledPaymentMethods();
      const appUrl = getAppUrl();
      const codigo = String(args?.codigo || "").trim().toUpperCase();

      let orderLink: Record<string, unknown> | null = null;

      if (codigo) {
        const isRide = codigo.startsWith("VIAJE");
        const where: any = isRide
          ? { tripNumber: codigo }
          : { orderNumber: codigo };

        if (!isRide && context?.customerId) {
          where.customerId = context.customerId;
        } else if (
          !isRide &&
          !ADMIN_ROLES.includes(context?.actorRole || "")
        ) {
          return {
            error:
              "No se pudo identificar al cliente para consultar ese pedido. Pide el código exacto o escribe desde el WhatsApp registrado.",
          };
        }

        if (isRide) {
          const trip = await prisma.rideTrip.findFirst({
            where,
            select: {
              id: true,
              tripNumber: true,
              status: true,
              fareAmount: true,
              paymentStatus: true,
            },
          });
          if (trip) {
            orderLink = {
              tipo: "MOTOTAXI",
              codigo: trip.tripNumber,
              estado: trip.status,
              totalBs: trip.fareAmount,
              estadoPago: trip.paymentStatus,
              urlPago: `${appUrl}/pagar/${trip.id}`,
              urlSeguimiento: `${appUrl}/seguimiento/${trip.id}`,
            };
          }
        } else {
          const order = await prisma.order.findFirst({
            where,
            select: {
              id: true,
              orderNumber: true,
              status: true,
              totalAmount: true,
              paymentStatus: true,
            },
          });
          if (order) {
            orderLink = {
              tipo: "DELIVERY",
              codigo: order.orderNumber,
              estado: order.status,
              totalBs: order.totalAmount,
              estadoPago: order.paymentStatus,
              urlPago: `${appUrl}/pagar/${order.id}`,
              urlSeguimiento: `${appUrl}/seguimiento/${order.id}`,
            };
          }
        }

        if (!orderLink) {
          return {
            metodos: methods.map(publicMethod),
            error: `No encontramos el código ${codigo}. Verifica el código del pedido o carrera.`,
          };
        }
      }

      return {
        metodos: methods.map(publicMethod),
        enlacePedido: orderLink,
        instruccion:
          "Explica los métodos con los datos exactos. Para QR o billeteras, comparte el enlace de pago del pedido si existe. " +
          "El cliente debe reportar el pago desde ese enlace; la verificación la realiza un operador.",
      };
    } catch (error: any) {
      console.error("[PaymentMethodsTool] Error:", error);
      return { error: `No se pudieron consultar los métodos de pago: ${error.message}` };
    }
  },
};

function publicMethod(method: {
  id: string;
  label: string;
  type: string;
  emoji: string;
  accountName: string;
  accountNumber: string;
  instructions: string;
  qrImage: string;
}) {
  return {
    id: method.id,
    nombre: method.label,
    tipo: method.type,
    emoji: method.emoji,
    titular: method.accountName || null,
    cuenta: method.accountNumber || null,
    instrucciones: method.instructions,
    tieneQr: Boolean(method.qrImage),
    urlQr: method.qrImage
      ? `/api/public/payment-qr/${encodeURIComponent(method.id)}`
      : null,
  };
}
