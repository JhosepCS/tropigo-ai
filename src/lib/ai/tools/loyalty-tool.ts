import { IAssistantTool } from "./types";
import { OrderToolContext } from "../../orders/order-service";
import { getLoyaltySummary } from "../../loyalty/service";

/**
 * Consulta la tarjeta de fidelidad del cliente de la conversación actual.
 * Nunca acepta un customerId por argumento: el contexto del canal es la
 * única fuente de identidad, para no filtrar datos entre clientes.
 */
export const loyaltyTool: IAssistantTool = {
  name: "consultar_mi_fidelidad",
  description:
    "Consulta los sellos, el premio disponible y el enlace/QR de la tarjeta de fidelidad del cliente de esta conversación. " +
    "Úsala cuando el cliente pregunte cuántos sellos tiene, si ya ganó su pedido gratis o cómo obtener su QR personal. " +
    "No revela información de otros clientes.",
  parameters: {
    type: "object",
    properties: {},
    required: [],
  },
  async execute(_args: unknown, context?: OrderToolContext) {
    try {
      if (!context?.customerId) {
        return {
          error:
            "No se pudo identificar al cliente de esta conversación. Pídele que escriba desde su WhatsApp registrado.",
        };
      }

      const summary = await getLoyaltySummary(context.customerId);
      const missing = Math.max(0, summary.stampsNeeded - summary.stamps);

      return {
        cliente: summary.customerName,
        codigo: summary.code,
        sellos: summary.stamps,
        sellosParaPremio: summary.stampsNeeded,
        sellosFaltantes: missing,
        premioDisponible: summary.rewardAvailable,
        premioDescripcion: summary.rewardDescription,
        premiosCanjeados: summary.rewardsRedeemed,
        totalSellosGanados: summary.totalEarned,
        programaActivo: summary.programEnabled,
        urlTarjeta: summary.qrUrl,
        mensaje: !summary.programEnabled
          ? "El programa de fidelidad está temporalmente pausado; tus sellos se conservan."
          : summary.rewardAvailable
          ? `¡Ya tienes tu premio disponible! Tu próximo pedido confirmado se aplica como gratis (${summary.rewardDescription}).`
          : `Tienes ${summary.stamps} de ${summary.stampsNeeded} sellos. Te faltan ${missing} sello(s) para tu pedido gratis.`,
        instruccionParaAsistente:
          "Comparte el enlace de la tarjeta solo si el cliente lo pide. No inventes sellos ni prometas premios que la herramienta no confirme.",
      };
    } catch (error: any) {
      console.error("[Tool: consultar_mi_fidelidad] Error:", error);
      return {
        error: `No se pudo consultar la tarjeta de fidelidad: ${error.message}`,
      };
    }
  },
};
