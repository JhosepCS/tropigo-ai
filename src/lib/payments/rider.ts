import { PaymentMethodType } from "./types";

/**
 * QR personal de cobro de un repartidor. El repartidor puede tener una sola
 * cuenta principal (Tigo Money, Yape, ZAS, Altoke, banco, etc.) o varias; por
 * ahora se guarda una configuración principal por repartidor.
 */
export interface RiderPaymentQr {
  label: string;
  type: PaymentMethodType;
  accountName: string;
  accountNumber: string;
  qrImage: string;
  instructions: string;
}

export const RIDER_QR_METHOD_ID = "rider-qr";

export function emptyRiderPaymentQr(): RiderPaymentQr {
  return {
    label: "",
    type: "WALLET",
    accountName: "",
    accountNumber: "",
    qrImage: "",
    instructions: "",
  };
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parseRiderPaymentQr(
  raw: string | null | undefined
): RiderPaymentQr | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const label = cleanString((parsed as any).label);
    const accountName = cleanString((parsed as any).accountName);
    const accountNumber = cleanString((parsed as any).accountNumber);
    const qrImage = cleanString((parsed as any).qrImage);
    const type = cleanString((parsed as any).type) as PaymentMethodType;
    const instructions = cleanString((parsed as any).instructions);
    if (!label && !accountName && !accountNumber && !qrImage) return null;
    return {
      label: label || "QR del repartidor",
      type: ["CASH", "QR", "WALLET", "BANK"].includes(type) ? type : "WALLET",
      accountName,
      accountNumber,
      qrImage,
      instructions,
    };
  } catch {
    return null;
  }
}

export function serializeRiderPaymentQr(qr: RiderPaymentQr): string {
  return JSON.stringify({
    label: cleanString(qr.label).slice(0, 80),
    type: qr.type,
    accountName: cleanString(qr.accountName).slice(0, 120),
    accountNumber: cleanString(qr.accountNumber).slice(0, 80),
    qrImage: cleanString(qr.qrImage),
    instructions: cleanString(qr.instructions).slice(0, 300),
  });
}

/**
 * Código canónico de pago a partir del nombre de la billetera que aparece en
 * un comprobante (Tigo Money, Yape, ZAS, Altoke, transferencia, etc.).
 */
export function walletToPaymentCode(wallet?: string | null): string {
  const normalized = String(wallet || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalized.includes("tigo")) return "TIGO_MONEY";
  if (normalized.includes("yape")) return "YAPE";
  if (normalized.includes("zas")) return "ZAS";
  if (normalized.includes("altoke")) return "ALTOKE";
  if (normalized.includes("transfer")) return "TRANSFERENCIA";
  if (normalized.includes("efectivo")) return "EFECTIVO";
  return "QR_BANCO";
}

export function walletToProvider(wallet?: string | null): string {
  const label = String(wallet || "").trim();
  return label ? label.slice(0, 80) : "COMPROBANTE";
}
