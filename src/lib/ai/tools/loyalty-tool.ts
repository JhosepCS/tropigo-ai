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
    "Consulta los sellos, pedidos entregados, carreras finalizadas, el premio disponible y el enlace/QR de la tarjeta de fidelidad del cliente de esta conversación. " +
    "Úsala cuando el cliente pregunte cuántos sellos tiene, cuántos pedidos o carreras le faltan, si ya ganó su pedido gratis o cómo obtener su QR personal. " +
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
      const missing = summary.missingForReward;
      const missingLabel = summary.countRides
        ? `${missing} pedido(s) o carrera(s)`
        : `${missing} pedido(s)`;

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
        pedidosEntregados: summary.completedOrders,
        carrerasFinalizadas: summary.completedRides,
        carrerasSolicitadas: summary.requestedRides,
        carrerasSumanSellos: summary.countRides,
        proximoPremioEnElNumero: summary.nextRewardAtNumber,
        programaActivo: summary.programEnabled,
        urlTarjeta: summary.qrUrl,
        mensaje: !summary.programEnabled
          ? "El programa de fidelidad está temporalmente pausado; tus sellos se conservan."
          : summary.rewardAvailable
          ? `¡Ya puedes reclamar tu premio! ${summary.rewardDescription}. Se aplica automáticamente al confirmar tu próximo pedido.`
          : `Tienes ${summary.stamps} de ${summary.stampsNeeded} sellos. Te faltan ${missingLabel} para completar la tarjeta. Tu premio se activa en el número ${summary.nextRewardAtNumber}.`,
        detalle: `Llevas ${summary.completedOrders} pedido(s) entregado(s) y ${summary.completedRides} carrera(s) finalizada(s). ${
          summary.countRides
            ? "Las carreras finalizadas también suman sellos."
            : "Las carreras se muestran como dato adicional, pero no suman sellos en este momento."
        }`,
        instruccionParaAsistente:
          "Explica los números exactos que devuelve la herramienta. No inventes sellos ni prometas premios que no confirme. Comparte el enlace de la tarjeta solo si el cliente lo pide. Si el cliente pregunta cómo sumar, recuérdale que cada pedido entregado suma 1 sello" +
          (summary.countRides ? " y que cada carrera finalizada también suma 1 sello." : "."),
      };
    } catch (error: any) {
      console.error("[Tool: consultar_mi_fidelidad] Error:", error);
      return {
        error: `No se pudo consultar la tarjeta de fidelidad: ${error.message}`,
      };
    }
  },
};
