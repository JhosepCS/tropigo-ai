/**
 * Formato de respuestas del asistente.
 *
 * La IA debe sonar humana y breve. Este módulo limpia la salida del modelo
 * antes de enviarla por WhatsApp o mostrarla en el CRM:
 *  - elimina líneas repetidas y párrafos vacíos,
 *  - limita el largo de las respuestas conversacionales,
 *  - respeta los resúmenes de pedido (que sí necesitan detalle),
 *  - nunca corta una URL a la mitad.
 */

const ORDER_SUMMARY_MARKERS =
  /RESUMEN DE TU PEDIDO|N[uú]mero de pedido|Total a pagar|Subtotal|Costo de env[ií]o|quoteId/i;

const URL_PATTERN = /https?:\/\/[^\s)]+/gi;

export interface ReplyFormatOptions {
  /** Largo máximo para respuestas normales. */
  maxChars?: number;
  /** Líneas máximas para respuestas normales. */
  maxLines?: number;
  /** Fuerza el modo largo (resúmenes, listas de precios, etc.). */
  allowLong?: boolean;
}

export function isOrderSummary(text: string): boolean {
  return ORDER_SUMMARY_MARKERS.test(String(text || ""));
}

function collapseBlankLines(text: string): string {
  return text.replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
}

function removeRepeatedLines(text: string): string {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const line of text.split("\n")) {
    const key = line.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    if (!key) {
      result.push(line);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(line);
  }

  return result.join("\n");
}

/** Evita cortar una URL cuando se recorta el texto. */
function safeCut(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;

  const urls = Array.from(text.matchAll(URL_PATTERN));
  for (const match of urls) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (start < maxChars && end > maxChars) {
      // La URL cruza el límite: conservarla completa.
      return text.slice(0, end).trim();
    }
  }

  const window = text.slice(0, maxChars);
  const lastBreak = Math.max(
    window.lastIndexOf(". "),
    window.lastIndexOf("? "),
    window.lastIndexOf("! "),
    window.lastIndexOf("\n")
  );

  const cut = lastBreak > maxChars * 0.55 ? window.slice(0, lastBreak + 1) : window;
  const trimmed = cut.trim();
  if (!trimmed) return trimmed;
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}…`;
}

function limitLines(text: string, maxLines: number): string {
  const lines = text.split("\n");
  if (lines.length <= maxLines) return text;

  const kept = lines.slice(0, maxLines).join("\n").trimEnd();
  return /[.!?…]$/.test(kept) ? kept : `${kept}…`;
}

export function sanitizeAssistantReply(
  raw: string,
  options: ReplyFormatOptions = {}
): string {
  let text = String(raw || "").replace(/\r\n/g, "\n").trim();
  if (!text) return "";

  const allowLong = options.allowLong ?? isOrderSummary(text);

  text = collapseBlankLines(text);

  if (allowLong) {
    // Los resúmenes de pedido se envían tal cual: pueden tener productos
    // repetidos legítimos y el cliente necesita el detalle completo.
    return text;
  }

  // Solo las respuestas conversacionales se limpian de líneas repetidas.
  text = removeRepeatedLines(text);
  text = collapseBlankLines(text);

  const maxLines = options.maxLines ?? 8;
  const maxChars = options.maxChars ?? 650;

  text = limitLines(text, maxLines);
  text = safeCut(text, maxChars);

  return collapseBlankLines(text);
}
