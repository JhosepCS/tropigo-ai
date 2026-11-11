const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_PATTERN = new RegExp(`TGO-[${CODE_ALPHABET}]{8}`, "i");

/**
 * Normaliza un código de fidelidad. Acepta el código puro o una URL que lo
 * contenga (por ejemplo, la URL codificada dentro del QR personal).
 */
export function normalizeLoyaltyCode(value?: string | null): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const match = raw.match(CODE_PATTERN);
  if (!match) return null;

  return match[0].toUpperCase();
}

/**
 * Extrae el código de fidelidad de cualquier texto: URL del QR, texto pegado
 * por el cliente o el contenido decodificado de una imagen.
 */
export function extractLoyaltyCode(value?: string | null): string | null {
  return normalizeLoyaltyCode(value);
}

export function isLoyaltyCode(value?: string | null): boolean {
  return normalizeLoyaltyCode(value) !== null;
}
