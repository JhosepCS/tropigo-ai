import { getLoyaltyCardByCode } from "./service";
import { extractLoyaltyCode } from "./code";

/**
 * Convierte una tarjeta de fidelidad en un bloque de contexto legible para la
 * IA. Se usa cuando el cliente envía una foto de su QR o escribe su código.
 * Nunca incluye teléfono ni datos de contacto.
 */
export async function buildLoyaltyCardPrompt(
  code: string
): Promise<string | null> {
  const normalized = extractLoyaltyCode(code);
  if (!normalized) return null;

  const card = await getLoyaltyCardByCode(normalized);
  if (!card) {
    return [
      "[TARJETA DE FIDELIDAD DETECTADA]",
      `Código: ${normalized}`,
      "La tarjeta no existe o no está activa.",
      "Instrucción: pide al cliente que verifique el código o que consulte desde su WhatsApp registrado.",
    ].join("\n");
  }

  return [
    "[TARJETA DE FIDELIDAD DETECTADA EN EL QR/CÓDIGO]",
    `Código: ${card.code}`,
    `Titular: ${card.displayName}`,
    `Sellos: ${card.stamps} de ${card.stampsNeeded}`,
    `Sellos faltantes: ${card.missingForReward}`,
    `Premio disponible: ${card.rewardAvailable ? "SÍ" : "NO"}`,
    `Premio configurado: ${card.settings.rewardDescription}`,
    `Pedidos entregados: ${card.completedOrders}`,
    `Carreras finalizadas: ${card.completedRides}`,
    `Carreras suman sellos: ${card.countRides ? "SÍ" : "NO"}`,
    `Próximo premio en el número: ${card.nextRewardAtNumber}`,
    "Instrucción: explica estos datos exactos al cliente. No inventes sellos ni premios. Si el premio está disponible, dile que puede reclamarlo en su próximo pedido.",
  ].join("\n");
}
