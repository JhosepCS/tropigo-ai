import { getLoyaltyCardByCode, getLoyaltySummary } from "./service";
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
    `Nivel: ${card.levelEmoji} ${card.levelLabel}${
      card.nextLevelAt ? ` (próximo nivel a los ${card.nextLevelAt} servicios)` : " (nivel máximo)"
    }`,
    `Sellos: ${card.stamps} de ${card.stampsNeeded}`,
    `Sellos faltantes: ${card.missingForReward}`,
    `Premio disponible: ${card.rewardAvailable ? "SÍ" : "NO"}`,
    `Premio configurado: ${card.settings.rewardDescription}`,
    `Pedidos entregados: ${card.completedOrders}`,
    `Carreras finalizadas: ${card.completedRides}`,
    `Carreras suman sellos: ${card.countRides ? "SÍ" : "NO"}`,
    `Sellos por servicio: ${card.stampsPerEvent}${
      card.doubleStampsActive ? " (promoción de sellos dobles activa)" : ""
    }`,
    `Próximo premio en el número: ${card.nextRewardAtNumber}`,
    "Instrucción: explica estos datos exactos al cliente. No inventes sellos ni premios. Si el premio está disponible, dile que puede reclamarlo en su próximo pedido.",
  ].join("\n");
}

/**
 * Contexto proactivo de fidelidad para el cliente identificado en el canal.
 * Permite que la IA salude mencionando su nivel y sus sellos sin que el
 * cliente tenga que preguntar.
 */
export async function buildCustomerLoyaltyPrompt(
  customerId: string
): Promise<string | null> {
  try {
    const summary = await getLoyaltySummary(customerId);
    if (!summary.programEnabled) return null;

    const lines = [
      "[CONTEXTO DE FIDELIDAD DEL CLIENTE ACTUAL]",
      `Código: ${summary.code}`,
      `Nivel: ${summary.levelEmoji} ${summary.levelLabel}`,
      `Sellos: ${summary.stamps} de ${summary.stampsNeeded} (${summary.progressPercent}% de la tarjeta)`,
      `Premio disponible: ${summary.rewardAvailable ? "SÍ" : "NO"}`,
      `Sellos faltantes para el premio: ${summary.missingForReward}`,
      `Pedidos entregados: ${summary.completedOrders}`,
      `Carreras finalizadas: ${summary.completedRides}`,
      `Premio: ${summary.rewardDescription}`,
    ];

    if (summary.doubleStampsActive) {
      lines.push(
        "Promoción activa: cada pedido entregado o carrera finalizada suma 2 sellos."
      );
    }

    if (summary.rewardAvailable) {
      lines.push(
        "Instrucción proactiva: felicita al cliente y recuérdale que su próximo pedido es gratis. Ofrécele aplicarlo."
      );
    } else if (summary.missingForReward <= 2) {
      lines.push(
        `Instrucción proactiva: dile que está muy cerca del premio, le faltan ${summary.missingForReward} sello(s).`
      );
    } else {
      lines.push(
        "Instrucción: puedes mencionar su nivel y sellos de forma breve y natural, sin saturar la conversación."
      );
    }

    lines.push("No inventes sellos, niveles ni premios distintos a estos datos.");

    return lines.join("\n");
  } catch (error) {
    console.error("[LoyaltyPrompt] Error al construir contexto:", error);
    return null;
  }
}
