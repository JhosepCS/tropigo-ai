import { prisma } from "../../prisma";
import { IAssistantTool } from "./types";
import { OrderToolContext } from "../../orders/order-service";

export const recommendationTool: IAssistantTool = {
  name: "sugerir_pedido_anterior",
  description:
    "Consulta los últimos pedidos entregados del cliente actual para sugerirle repetir uno. " +
    "Úsala cuando el cliente diga 'lo mismo de siempre', 'repetir mi último pedido', 'qué pedí la otra vez' " +
    "o cuando sea un cliente recurrente y quieras brindarle una atención personalizada y rápida.",
  parameters: {
    type: "object",
    properties: {},
    required: [],
  },
  execute: async (_args: Record<string, unknown>, context?: OrderToolContext) => {
    if (!context?.customerId) {
      return {
        error: "No se pudo identificar al cliente actual de la conversación.",
      };
    }

    const previousOrders = await prisma.order.findMany({
      where: {
        customerId: context.customerId,
        status: "ENTREGADO",
      },
      include: {
        merchant: {
          select: { name: true },
        },
        items: {
          include: {
            product: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    });

    if (previousOrders.length === 0) {
      return {
        tieneHistorial: false,
        mensaje: "El cliente aún no tiene pedidos entregados anteriormente.",
      };
    }

    const ultimosPedidos = previousOrders.map((ord) => {
      const platos = ord.items.map((it) => {
        const nombre = it.product?.name || it.productName || "Plato";
        return `${it.quantity}x ${nombre}`;
      });

      return {
        orderNumber: ord.orderNumber,
        fecha: ord.createdAt.toISOString().split("T")[0],
        comercio: ord.merchant?.name || "Restaurante de Ivirgarzama",
        platos: platos.join(", "),
        totalAmount: ord.totalAmount,
        resumenTexto: `${platos.join(", ")} de ${ord.merchant?.name || "restaurante"} por ${ord.totalAmount.toFixed(2)} Bs.`,
      };
    });

    const masReciente = ultimosPedidos[0];

    return {
      tieneHistorial: true,
      pedidosEntregadosRecientes: ultimosPedidos,
      ultimoPedido: masReciente,
      sugerenciaParaIA: `El cliente suele pedir: ${masReciente.resumenTexto}. Puedes sugerirle con calidez si desea pedir lo mismo hoy.`,
    };
  },
};
