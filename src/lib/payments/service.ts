import { prisma } from "../prisma";
import {
  DEFAULT_PAYMENT_METHODS,
  PaymentMethodConfig,
  parsePaymentMethods,
  serializePaymentMethods,
} from "./types";

/**
 * Devuelve los métodos de pago configurados. Si el negocio todavía no guardó
 * ninguno, devuelve la lista por defecto (Altoke, Yape, ZAS, QR Simple,
 * Tigo Money, transferencia y efectivo).
 */
export async function getPaymentMethods(): Promise<PaymentMethodConfig[]> {
  const business = await prisma.businessProfile.findFirst({
    select: { paymentMethodsJson: true, phone: true },
  });

  const methods = parsePaymentMethods(business?.paymentMethodsJson);

  // Los métodos por defecto de billeteras usan el teléfono del negocio si el
  // administrador todavía no cargó un número específico.
  return methods.map((method) => {
    if (
      !method.accountNumber &&
      (method.id === "tigo-money" || method.id === "altoke" || method.id === "yape" || method.id === "zas")
    ) {
      return { ...method, accountNumber: business?.phone || "" };
    }
    return method;
  });
}

export async function getEnabledPaymentMethods(): Promise<PaymentMethodConfig[]> {
  const methods = await getPaymentMethods();
  return methods.filter((method) => method.enabled);
}

export async function getPaymentMethodById(
  id: string
): Promise<PaymentMethodConfig | null> {
  const cleanId = String(id || "").trim();
  if (!cleanId) return null;
  const methods = await getPaymentMethods();
  return methods.find((method) => method.id === cleanId) || null;
}

export async function savePaymentMethods(
  methods: PaymentMethodConfig[]
): Promise<PaymentMethodConfig[]> {
  const normalized = parsePaymentMethods(methods);
  const business = await prisma.businessProfile.findFirst({
    select: { id: true },
  });

  if (business) {
    await prisma.businessProfile.update({
      where: { id: business.id },
      data: { paymentMethodsJson: serializePaymentMethods(normalized) },
    });
  } else {
    await prisma.businessProfile.create({
      data: { paymentMethodsJson: serializePaymentMethods(normalized) },
    });
  }

  return normalized;
}

export function defaultPaymentMethods(): PaymentMethodConfig[] {
  return DEFAULT_PAYMENT_METHODS.map((method) => ({ ...method }));
}
