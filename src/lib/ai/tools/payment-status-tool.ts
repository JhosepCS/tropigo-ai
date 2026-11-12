import { prisma } from "../../prisma";
import { IAssistantTool } from "./types";
import { OrderToolContext } from "../../orders/order-service";
import { paymentMethodLabel } from "../../payments/types";

export const paymentStatusTool: IAssistantTool = {
  name: "consultar_mis_pagos",
  description:
    "Consulta los pagos reportados o verificados del cliente de esta conversación: pedidos, montos, billetera/QR usado, referencia y estado (PENDIENTE, PAGADO_VERIFICADO o RECHAZADO). " +
    "Úsala cuando el cliente pregunte si su pago ya fue confirmado, por el estado de su comprobante o por el historial de pagos. Nunca revela pagos de otros clientes.",
  parameters: {
    type: "object",
    properties: {
      codigo: {
        type: "string",
        description:
          "Código opcional del pedido (ej. TRP-1045). Si se omite, devuelve los pagos más recientes del cliente.",
      },
    },
  },
  async execute(args: { codigo?: string }, context?: OrderToolContext) {
    try {
      if (!context?.customerId) {
        return {
          error:
            "No se pudo identificar al cliente de la conversación. Pídele que escriba desde su WhatsApp registrado.",
        };
      }

      const code = String(args?.codigo || "").trim().toUpperCase();

      const orderWhere: any = { customerId: context.customerId };
      if (code) {
        orderWhere.orderNumber = code;
      }

      const orders = await prisma.order.findMany({
        where: orderWhere,
        orderBy: { createdAt: "desc" },
        take: code ? 1 : 5,
        select: {
          id: true,
          orderNumber: true,
          totalAmount: true,
          paymentStatus: true,
          paymentMethod: true,
          status: true,
          createdAt: true,
        },
      });

      if (orders.length === 0) {
        return {
          pagos: [],
          mensaje: code
            ? `No encontré el pedido ${code} para este cliente.`
            : "No encontré pedidos recientes para este cliente.",
        };
      }

      const records = await prisma.paymentRecord.findMany({
        where: { orderId: { in: orders.map((order) => order.id) } },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          orderId: true,
          amount: true,
          provider: true,
          methodId: true,
          reference: true,
          verificationStatus: true,
          receiptAnalysisJson: true,
          createdAt: true,
        },
      });

      const byOrder = new Map(orders.map((order) => [order.id, order]));

      const pagos = records.map((record) => {
        const order = record.orderId ? byOrder.get(record.orderId) : null;
        let wallet = record.provider;
        try {
          const parsed = record.receiptAnalysisJson
            ? JSON.parse(record.receiptAnalysisJson)
            : null;
          if (parsed?.wallet) wallet = String(parsed.wallet);
        } catch {
          // El JSON de análisis es opcional.
        }

        return {
          pedido: order?.orderNumber || null,
          montoBs: record.amount,
          estadoPago: record.verificationStatus,
          billetera: wallet,
          metodo: record.methodId === "rider-qr" ? "QR del repartidor" : record.methodId,
          referencia: record.reference,
          fecha: record.createdAt.toISOString(),
        };
      });

      const ordersWithoutRecords = orders
        .filter((order) => !records.some((record) => record.orderId === order.id))
        .map((order) => ({
          pedido: order.orderNumber,
          montoBs: order.totalAmount,
          estadoPago: order.paymentStatus,
          billetera: null,
          metodo: paymentMethodLabel(order.paymentMethod),
          referencia: null,
          fecha: order.createdAt.toISOString(),
        }));

      const todos = [...pagos, ...ordersWithoutRecords].slice(0, 10);

      const lineas = todos
        .map(
          (pago) =>
            `• ${pago.pedido || "Pedido"}: ${Number(pago.montoBs).toFixed(2)} Bs. — ${
              pago.estadoPago === "PAGADO_VERIFICADO"
                ? "PAGO VERIFICADO"
                : pago.estadoPago === "RECHAZADO"
                ? "RECHAZADO"
                : "PENDIENTE"
            }${pago.billetera ? ` (${pago.billetera})` : ""}`
        )
        .join("\n");

      return {
        pagos: todos,
        mensaje: `Estado de pagos del cliente:\n${lineas}`,
        instruccion:
          "Responde con estos datos exactos. Si está PENDIENTE, indica que un operador lo revisará. No inventes una verificación.",
      };
    } catch (err: any) {
      console.error("[Tool: consultar_mis_pagos] Error:", err);
      return { error: `No se pudieron consultar los pagos: ${err.message}` };
    }
  },
};
