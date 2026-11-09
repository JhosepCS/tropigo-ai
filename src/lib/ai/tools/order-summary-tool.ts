import { IAssistantTool } from "./types";
import {
  createOrderQuote,
  CreateQuoteInput,
  OrderToolContext,
} from "../../orders/order-service";

export interface OrderItemInput {
  producto: string;
  cantidad: number;
  variante?: string;
  opciones?: string[];
  notas?: string;
}

export const orderSummaryTool: IAssistantTool = {
  name: "preparar_resumen_pedido",
  description:
    "Prepara la cotización oficial de un pedido de delivery en Ivirgarzama y genera el resumen que el cliente debe confirmar. " +
    "Valida comercio, productos, variantes, opciones y zona contra la base de datos; calcula subtotal, envío y total en Bolivianos (Bs.). " +
    "Devuelve un quoteId que debe usarse después en 'registrar_pedido' únicamente si el cliente confirma explícitamente. " +
    "Nunca inventa zonas ni tarifas: si la zona no coincide, devuelve las zonas disponibles para que el cliente precise la suya.",
  parameters: {
    type: "object",
    properties: {
      comercio: {
        type: "string",
        description: "Nombre o ID del restaurante o comercio (ej: 'Pollería El Pahuichi', 'Comidas Doña Julia').",
      },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            producto: { type: "string", description: "Nombre del plato o producto a pedir." },
            cantidad: { type: "integer", minimum: 1, description: "Cantidad de porciones o unidades." },
            variante: { type: "string", description: "Variante opcional (ej: 'Pierna', 'Pecho', 'Doble')." },
            opciones: {
              type: "array",
              items: { type: "string" },
              description: "Opciones o adicionales elegidos (ej: 'Arroz con queso', 'Extra llajwa').",
            },
            notas: { type: "string", description: "Instrucciones de cocina (ej: 'Sin ensalada', 'Bien frito')." },
          },
          required: ["producto", "cantidad"],
        },
        description: "Lista de productos y cantidades que desea el cliente.",
      },
      direccionEntrega: {
        type: "string",
        description: "Dirección física, barrio o descripción del lugar de entrega en Ivirgarzama.",
      },
      zonaDestino: {
        type: "string",
        description: "Zona o barrio exacto de entrega. Debe coincidir con una zona activa del sistema.",
      },
      referencia: {
        type: "string",
        description: "Punto de referencia opcional (ej: 'Frente al surtidor', 'Portón negro').",
      },
      latitud: {
        type: "number",
        description: "Latitud GPS de la ubicación enviada por WhatsApp (si el cliente compartió su ubicación).",
      },
      longitud: {
        type: "number",
        description: "Longitud GPS de la ubicación enviada por WhatsApp.",
      },
      metodoPago: {
        type: "string",
        enum: ["EFECTIVO", "QR_BANCO"],
        description: "Método de pago: EFECTIVO o QR_BANCO. Por defecto EFECTIVO.",
      },
      notasCliente: {
        type: "string",
        description: "Notas adicionales del cliente para la entrega.",
      },
    },
    required: ["comercio", "items", "direccionEntrega"],
  },
  async execute(args: CreateQuoteInput, context?: OrderToolContext) {
    return createOrderQuote(args, context || {});
  },
};
