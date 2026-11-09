/**
 * Detección determinística de confirmación explícita de pedidos.
 *
 * Regla de seguridad: el texto del modelo NUNCA autoriza un pedido. Solo una
 * respuesta real del cliente, recibida por el canal (WhatsApp), puede hacerlo.
 * Este módulo no usa IA: clasifica el texto entrante con patrones acotados.
 */

export function normalizeConfirmationText(text: string): string {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Frases que indican que el cliente NO confirma, quiere cambiar algo o pide esperar.
const NEGATIVE_OR_MODIFICATION_PATTERNS: RegExp[] = [
  /\bno\b.*\bconfirm/,
  /\bno lo confirmo\b/,
  /\baun no\b/,
  /\btodavia no\b/,
  /\bespera\b/,
  /\besperate\b/,
  /\bdespues\b/,
  /\bluego\b/,
  /\bcambia/,
  /\bcambiar/,
  /\bmodifica/,
  /\bmodificar/,
  /\bcorrige/,
  /\bcorregir/,
  /\bagrega/,
  /\bagregar/,
  /\banade/,
  /\banadir/,
  /\bquita/,
  /\bquitar/,
  /\bsaca\b/,
  /\bsacar\b/,
  /\bcancela/,
  /\bcancelar/,
  /\banula/,
  /\banular/,
  /\bno estoy seguro\b/,
  /\bquizas\b/,
  /\btal vez\b/,
  /\bpero\b/,
  /\bsin\b/,
  /\bsolo\b/,
  /\bmejor\b/,
  /\botro pedido\b/,
  /\botra cosa\b/,
  /\ben vez de\b/,
  /\ben lugar de\b/,
  /\bademas\b/,
  /\btambien\b/,
  /\bextra\b/,
  /\bpago\b/,
  /\bpagar\b/,
  /\bqr\b/,
  /\befectivo\b/,
  /\btarjeta\b/,
  /\btigo\b/,
  /\bdireccion\b/,
  /\bzona\b/,
  /\bcantidad\b/,
  /\bunidad/,
  /\bunidades\b/,
];

const SHORT_POSITIVE = new Set([
  "si",
  "claro",
  "ok",
  "okay",
  "dale",
  "listo",
  "correcto",
  "perfecto",
  "de acuerdo",
  "adelante",
  "procede",
  "envialo",
  "mandalo",
  "hazlo",
  "confirmo",
  "confirmado",
]);

const POSITIVE_PATTERNS: RegExp[] = [
  /\b(si|claro|ok|okay|dale|listo|correcto|perfecto|de acuerdo)\b.*\b(confirmo|confirmado|confirmar|adelante|procede|envialo|mandalo|hazlo)\b/,
  /\b(confirmo|confirmado)\b/,
  /\b(dale adelante|si adelante|de acuerdo adelante|confirmo el pedido|confirmo mi pedido|confirmo la orden|confirmo todo)\b/,
];

export function isExplicitConfirmation(text: string): boolean {
  const normalized = normalizeConfirmationText(text);
  if (!normalized) return false;

  if (NEGATIVE_OR_MODIFICATION_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return false;
  }

  if (SHORT_POSITIVE.has(normalized)) return true;
  return POSITIVE_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * Confirmación "limpia": afirmativa, sin pedir cambios ni agregar detalles.
 * Se usa para autorizar el registro automático en el servidor. Si el cliente
 * mezcla una confirmación con un cambio ("sí, pero agrega..."), se deriva al
 * asistente para que prepare una nueva cotización.
 */
export function isSafeExplicitConfirmation(text: string): boolean {
  if (!isExplicitConfirmation(text)) return false;

  const normalized = normalizeConfirmationText(text);
  const tokens = normalized.split(" ").filter(Boolean);

  // Una confirmación real suele ser corta. Mensajes largos con más contenido
  // se tratan como una conversación que requiere revisión del asistente.
  if (tokens.length > 8) return false;

  if (NEGATIVE_OR_MODIFICATION_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return false;
  }

  // Cualquier número (cantidades, precios) implica un posible cambio.
  if (/\d/.test(normalized)) return false;

  return true;
}
