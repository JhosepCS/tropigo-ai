import { IAssistantTool } from "./types";
import {
  confirmAndCreateOrder,
  OrderToolContext,
} from "../../orders/order-service";

export const orderCreateTool: IAssistantTool = {
  name: "registrar_pedido",
  description:
    "Registra en la base de datos el pedido asociado a una cotización ya presentada al cliente. " +
    "Solo debe invocarse después de que el cliente haya confirmado explícitamente el resumen. " +
    "El servidor verifica la confirmación real del canal y la cotización; el modelo no puede autorizar un pedido por sí solo. " +
    "Es idempotente: si la cotización ya fue consumida, devuelve el pedido existente sin crear un duplicado.",
  parameters: {
    type: "object",
    properties: {
      quoteId: {
        type: "string",
        description:
          "Identificador de la cotización devuelto por 'preparar_resumen_pedido'. Es la fuente de verdad de productos, precios, dirección y total.",
      },
      token: {
        type: "string",
        description: "Token opcional de la cotización, si el canal lo proporciona.",
      },
      notasCliente: {
        type: "string",
        description: "Notas adicionales confirmadas por el cliente para la entrega.",
      },
    },
    required: ["quoteId"],
  },
  async execute(
    args: { quoteId: string; token?: string; notasCliente?: string },
    context?: OrderToolContext
  ) {
    return confirmAndCreateOrder(
      {
        quoteId: args.quoteId,
        token: args.token,
        customerNotes: args.notasCliente,
      },
      context || {}
    );
  },
};
