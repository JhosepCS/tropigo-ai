export type PaymentMethodType = "CASH" | "QR" | "WALLET" | "BANK";

export interface PaymentMethodConfig {
  id: string;
  label: string;
  type: PaymentMethodType;
  enabled: boolean;
  emoji: string;
  accountName: string;
  accountNumber: string;
  /** Data URL (data:image/...) o URL https del QR de cobro. */
  qrImage: string;
  instructions: string;
}

export interface PublicPaymentMethod {
  id: string;
  label: string;
  type: PaymentMethodType;
  emoji: string;
  accountName: string;
  accountNumber: string;
  instructions: string;
  hasQr: boolean;
  qrUrl: string | null;
}

export const PAYMENT_METHOD_TYPES: PaymentMethodType[] = [
  "CASH",
  "QR",
  "WALLET",
  "BANK",
];

export const DEFAULT_PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    id: "efectivo",
    label: "Efectivo contra entrega",
    type: "CASH",
    enabled: true,
    emoji: "💵",
    accountName: "",
    accountNumber: "",
    qrImage: "",
    instructions: "Paga en efectivo al repartidor cuando recibas tu pedido.",
  },
  {
    id: "qr-simple",
    label: "QR Simple Interbancario",
    type: "QR",
    enabled: true,
    emoji: "🏦",
    accountName: "TropiGO Ivirgarzama",
    accountNumber: "",
    qrImage: "",
    instructions:
      "Escanea el QR con la app de tu banco (BNB, BCP, Mercantil, Banco Unión, etc.) y guarda el comprobante.",
  },
  {
    id: "tigo-money",
    label: "Tigo Money",
    type: "WALLET",
    enabled: true,
    emoji: "📲",
    accountName: "TropiGO",
    accountNumber: "",
    qrImage: "",
    instructions:
      "Envía el monto al número de Tigo Money de TropiGO y escribe el número de transacción.",
  },
  {
    id: "altoke",
    label: "Altoke",
    type: "WALLET",
    enabled: true,
    emoji: "⚡",
    accountName: "TropiGO",
    accountNumber: "",
    qrImage: "",
    instructions:
      "Paga desde Altoke escaneando el QR o al número de cuenta de TropiGO. Luego reporta el pago.",
  },
  {
    id: "yape",
    label: "Yape",
    type: "WALLET",
    enabled: true,
    emoji: "🟣",
    accountName: "TropiGO",
    accountNumber: "",
    qrImage: "",
    instructions:
      "Paga desde Yape escaneando el QR o al número registrado. Luego reporta el pago.",
  },
  {
    id: "zas",
    label: "ZAS",
    type: "WALLET",
    enabled: true,
    emoji: "🔵",
    accountName: "TropiGO",
    accountNumber: "",
    qrImage: "",
    instructions:
      "Paga desde ZAS escaneando el QR o al número registrado. Luego reporta el pago.",
  },
  {
    id: "transferencia",
    label: "Transferencia bancaria",
    type: "BANK",
    enabled: true,
    emoji: "🏛️",
    accountName: "TropiGO Ivirgarzama",
    accountNumber: "",
    qrImage: "",
    instructions:
      "Realiza la transferencia a la cuenta de TropiGO y reporta el número de comprobante.",
  },
];

function cleanString(value: unknown, maxLength = 300): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function cleanQrImage(value: unknown): string {
  const raw = cleanString(value, 1_600_000);
  if (!raw) return "";
  if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(raw)) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  return "";
}

function normalizeType(value: unknown): PaymentMethodType {
  const raw = String(value || "").toUpperCase();
  return (PAYMENT_METHOD_TYPES as string[]).includes(raw)
    ? (raw as PaymentMethodType)
    : "WALLET";
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/**
 * Normaliza la lista de métodos de pago guardada en BusinessProfile.
 * Si no existe configuración, devuelve los métodos por defecto (Altoke, Yape,
 * ZAS, QR Simple, Tigo Money, transferencia y efectivo).
 */
export function parsePaymentMethods(raw: unknown): PaymentMethodConfig[] {
  let source: unknown = raw;

  if (typeof raw === "string") {
    const text = raw.trim();
    if (!text) return DEFAULT_PAYMENT_METHODS.map((method) => ({ ...method }));
    try {
      source = JSON.parse(text);
    } catch {
      return DEFAULT_PAYMENT_METHODS.map((method) => ({ ...method }));
    }
  }

  if (!Array.isArray(source)) {
    return DEFAULT_PAYMENT_METHODS.map((method) => ({ ...method }));
  }

  const seen = new Set<string>();
  const methods: PaymentMethodConfig[] = [];

  source.slice(0, 20).forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const record = item as Record<string, unknown>;
    const label = cleanString(record.label, 80);
    if (!label) return;

    let id = slugify(cleanString(record.id, 40) || label) || `metodo-${index + 1}`;
    if (seen.has(id)) id = `${id}-${index + 1}`;
    seen.add(id);

    methods.push({
      id,
      label,
      type: normalizeType(record.type),
      enabled: record.enabled !== false,
      emoji: cleanString(record.emoji, 8) || "💳",
      accountName: cleanString(record.accountName, 120),
      accountNumber: cleanString(record.accountNumber, 80),
      qrImage: cleanQrImage(record.qrImage),
      instructions: cleanString(record.instructions, 500),
    });
  });

  return methods.length > 0
    ? methods
    : DEFAULT_PAYMENT_METHODS.map((method) => ({ ...method }));
}

export function serializePaymentMethods(
  methods: PaymentMethodConfig[]
): string {
  return JSON.stringify(methods);
}

export function isCashMethod(method: { type: PaymentMethodType }): boolean {
  return method.type === "CASH";
}

/**
 * Código canónico que se guarda en Order.paymentMethod / RideTrip.paymentMethod.
 * Mantiene compatibilidad con los valores históricos EFECTIVO y QR_BANCO.
 */
export function paymentMethodCode(method: {
  id: string;
  type: PaymentMethodType;
}): string {
  if (method.type === "CASH") return "EFECTIVO";
  const id = method.id.toLowerCase();
  if (id.includes("tigo")) return "TIGO_MONEY";
  if (id.includes("altoke")) return "ALTOKE";
  if (id.includes("yape")) return "YAPE";
  if (id.includes("zas")) return "ZAS";
  if (id.includes("transfer") || method.type === "BANK") return "TRANSFERENCIA";
  return "QR_BANCO";
}

export function paymentMethodLabel(value?: string | null): string {
  const code = String(value || "").trim().toUpperCase();
  switch (code) {
    case "EFECTIVO":
      return "Efectivo contra entrega";
    case "QR_BANCO":
    case "QR_SIMPLE":
      return "QR Simple Interbancario";
    case "TIGO_MONEY":
      return "Tigo Money";
    case "ALTOKE":
      return "Altoke";
    case "YAPE":
      return "Yape";
    case "ZAS":
      return "ZAS";
    case "TRANSFERENCIA":
      return "Transferencia bancaria";
    default:
      return value || "Efectivo contra entrega";
  }
}

export function normalizePaymentMethodCode(value?: string | null): string {
  const raw = String(value || "").trim().toUpperCase();
  if (
    ["EFECTIVO", "QR_BANCO", "TIGO_MONEY", "ALTOKE", "YAPE", "ZAS", "TRANSFERENCIA"].includes(
      raw
    )
  ) {
    return raw;
  }
  if (raw === "QR_SIMPLE") return "QR_BANCO";
  if (raw === "CASH") return "EFECTIVO";
  return "EFECTIVO";
}

export function paymentMethodTypeLabel(type: PaymentMethodType): string {
  switch (type) {
    case "CASH":
      return "Efectivo";
    case "QR":
      return "QR bancario";
    case "WALLET":
      return "Billetera digital";
    case "BANK":
      return "Transferencia";
  }
}
