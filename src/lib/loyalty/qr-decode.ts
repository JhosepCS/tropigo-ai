import jsQR from "jsqr";
import sharp from "sharp";
import { extractLoyaltyCode } from "./code";

export interface DecodedLoyaltyQr {
  code: string;
  raw: string;
}

/**
 * Intenta leer un QR de fidelidad desde una imagen (foto de la tarjeta,
 * captura de pantalla, etc.). Devuelve null si la imagen no contiene un QR
 * reconocible o si el QR no pertenece a una tarjeta TropiGO.
 *
 * No guarda la imagen ni el contenido decodificado.
 */
export async function decodeLoyaltyQrFromImage(
  buffer: Buffer
): Promise<DecodedLoyaltyQr | null> {
  if (!buffer || buffer.length === 0) return null;

  try {
    const { data, info } = await sharp(buffer)
      .rotate()
      .resize({
        width: 1400,
        height: 1400,
        fit: "inside",
        withoutEnlargement: true,
      })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const result = jsQR(
      new Uint8ClampedArray(data),
      info.width,
      info.height,
      { inversionAttempts: "attemptBoth" }
    );

    if (!result?.data) return null;

    const code = extractLoyaltyCode(result.data);
    if (!code) return null;

    return { code, raw: result.data };
  } catch (error) {
    console.warn("[LoyaltyQR] No se pudo leer el QR de la imagen:", error);
    return null;
  }
}
