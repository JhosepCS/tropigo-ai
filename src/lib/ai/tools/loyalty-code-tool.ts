import { IAssistantTool } from "./types";
import { getLoyaltyCardByCode } from "../../loyalty/service";
import { normalizeLoyaltyCode } from "../../loyalty/code";

/**
 * Consulta una tarjeta de fidelidad por el código público que va dentro del
 * QR personal (TGO-XXXXXXXX). Devuelve el nombre enmascarado y nunca el
 * teléfono ni otros datos de contacto.
 */
export const loyaltyCodeTool: IAssistantTool = {
  name: "consultar_fidelidad_por_codigo",
  description:
    "Consulta una tarjeta de fidelidad por su código público TGO-XXXXXXXX o por el contenido de su QR. " +
    "Úsala cuando el cliente envíe una foto de su tarjeta/QR o escriba un código de fidelidad. " +
    "Devuelve sellos, pedidos entregados, carreras finalizadas, cuántos faltan y si el premio está disponible. " +
    "No revela teléfono ni datos de contacto.",
  parameters: {
    type: "object",
    properties: {
      codigo: {
        type: "string",
        description:
          "Código de fidelidad del cliente, por ejemplo TGO-C5343E64. También acepta la URL del QR que contiene el código.",
      },
    },
    required: ["codigo"],
  },
  async execute(args: { codigo?: string }) {
    try {
      const code = normalizeLoyaltyCode(args?.codigo);
      if (!code) {
        return {
          error:
            "El código no tiene el formato válido. Debe ser TGO- seguido de 8 caracteres, por ejemplo TGO-C5343E64. Pide al cliente que revise su tarjeta o que envíe una foto clara del QR.",
        };
      }

      const card = await getLoyaltyCardByCode(code);
      if (!card) {
        return {
          error: `No se encontró una tarjeta activa con el código ${code}. Pide al cliente que verifique el código o que consulte desde su WhatsApp registrado.`,
        };
      }

      const eventLabel = card.countRides ? "pedido(s) o carrera(s)" : "pedido(s)";
      const missing = card.missingForReward;

      return {
        codigo: card.code,
        titular: card.displayName,
        sellos: card.stamps,
        sellosParaPremio: card.stampsNeeded,
        sellosFaltantes: missing,
        premioDisponible: card.rewardAvailable,
        premioDescripcion: card.settings.rewardDescription,
        pedidosEntregados: card.completedOrders,
        carrerasFinalizadas: card.completedRides,
        carrerasSolicitadas: card.requestedRides,
        carrerasSumanSellos: card.countRides,
        proximoPremioEnElNumero: card.nextRewardAtNumber,
        programaActivo: card.settings.enabled,
        mensaje: !card.settings.enabled
          ? "El programa de fidelidad está pausado; los sellos de esta tarjeta se conservan."
          : card.rewardAvailable
          ? `¡Esta tarjeta ya tiene el premio disponible! ${card.settings.rewardDescription}.`
          : `La tarjeta tiene ${card.stamps} de ${card.stampsNeeded} sellos. Faltan ${missing} ${eventLabel} para el premio.`,
        instruccionParaAsistente:
          "Usa el nombre enmascarado tal como aparece. No reveles teléfono ni datos de contacto. Explica los sellos y el premio con los números exactos de la herramienta. Si la tarjeta no es del cliente de esta conversación, trátala solo como una consulta de la tarjeta presentada.",
      };
    } catch (error: any) {
      console.error("[Tool: consultar_fidelidad_por_codigo] Error:", error);
      return {
        error: `No se pudo consultar la tarjeta de fidelidad: ${error.message}`,
      };
    }
  },
};
