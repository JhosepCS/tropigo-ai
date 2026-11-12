import { prisma } from "../prisma";
import { ReceiptAnalysis } from "../ai/multimodal";
import { getEnabledPaymentMethods } from "./service";
import {
  parseRiderPaymentQr,
  walletToPaymentCode,
} from "./rider";

export interface ReceiptRegistrationResult {
  matched: boolean;
  duplicate?: boolean;
  orderId?: string;
  orderNumber?: string;
  expectedAmount?: number;
  detectedAmount?: number | null;
  wallet?: string;
  reference?: string;
  verificationStatus?: "PAGADO_VERIFICADO" | "PENDIENTE";
  autoVerified?: boolean;
  message: string;
}

function normalize(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function amountMatches(expected: number, detected: number | null): boolean {
  if (detected == null || !Number.isFinite(detected)) return false;
  const tolerance = Math.max(0.75, expected * 0.02);
  return Math.abs(expected - detected) <= tolerance;
}

/**
 * Registra un comprobante recibido por WhatsApp/Webchat.
 *
 * Regla conservadora:
 * - Solo se verifica automáticamente si el monto coincide con el pedido,
 *   la confianza es alta y el titular/cuenta de destino coincide con el
 *   negocio o con el QR personal del repartidor asignado.
 * - En cualquier otro caso queda PENDIENTE para revisión manual.
 */
export async function registerReceiptPayment(input: {
  customerId: string;
  analysis: ReceiptAnalysis;
  mediaId?: string | null;
  caption?: string | null;
}): Promise<ReceiptRegistrationResult> {
  const { customerId, analysis } = input;

  if (!analysis.isReceipt) {
    return {
      matched: false,
      detectedAmount: analysis.amount,
      message:
        "La imagen no parece un comprobante de pago. No se registró ningún pago.",
    };
  }

  const order = await prisma.order.findFirst({
    where: {
      customerId,
      status: { not: "CANCELADO" },
      paymentStatus: { not: "PAGADO_VERIFICADO" },
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
    include: {
      assignedRider: { select: { id: true, name: true, paymentQrJson: true } },
      merchant: { select: { name: true } },
    },
  });

  if (!order) {
    return {
      matched: false,
      detectedAmount: analysis.amount,
      message:
        "No encontré un pedido pendiente de pago para este cliente. Si ya pagaste, comparte el código de tu pedido para revisarlo.",
    };
  }

  const recentDuplicate = await prisma.paymentRecord.findFirst({
    where: {
      orderId: order.id,
      createdAt: { gte: new Date(Date.now() - 3 * 60 * 1000) },
      reportedByCustomer: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (recentDuplicate) {
    return {
      matched: true,
      duplicate: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      expectedAmount: order.totalAmount,
      detectedAmount: analysis.amount,
      verificationStatus:
        recentDuplicate.verificationStatus === "PAGADO_VERIFICADO"
          ? "PAGADO_VERIFICADO"
          : "PENDIENTE",
      message: `Ya recibí un comprobante para el pedido ${order.orderNumber}. No lo registré dos veces.`,
    };
  }

  const methods = await getEnabledPaymentMethods();
  const business = await prisma.businessProfile.findFirst({
    select: { name: true, phone: true },
  });
  const riderQr = parseRiderPaymentQr(order.assignedRider?.paymentQrJson);

  const expectedRecipients = [
    business?.name,
    ...methods
      .filter((method) => method.type !== "CASH")
      .map((method) => method.accountName),
    riderQr?.accountName,
    riderQr?.label,
  ]
    .map(normalize)
    .filter((value) => value.length >= 4);

  const searchable = normalize(
    [analysis.recipientName, analysis.summary, analysis.rawText].join(" ")
  );
  const recipientMatches = expectedRecipients.some((expected) =>
    searchable.includes(expected)
  );

  const accountNumberMatches = Boolean(
    riderQr?.accountNumber &&
      riderQr.accountNumber.replace(/\D/g, "").length >= 4 &&
      analysis.rawText.replace(/\D/g, "").includes(
        riderQr.accountNumber.replace(/\D/g, "")
      )
  );

  const matchesAmount = amountMatches(order.totalAmount, analysis.amount);
  const autoVerified =
    matchesAmount &&
    analysis.confidence >= 0.7 &&
    (recipientMatches || accountNumberMatches);

  const walletLabel = analysis.wallet || "Comprobante";
  const provider = walletToPaymentCode(analysis.wallet);

  let methodId: string | null = null;
  if (riderQr) {
    const riderText = normalize(
      [riderQr.label, riderQr.accountName, riderQr.accountNumber].join(" ")
    );
    const walletText = normalize(analysis.wallet);
    if (
      (walletText && riderText.includes(walletText)) ||
      (analysis.recipientName &&
        normalize(analysis.recipientName) === normalize(riderQr.accountName)) ||
      accountNumberMatches
    ) {
      methodId = "rider-qr";
    }
  }

  if (!methodId) {
    const matchedMethod = methods.find((method) => {
      const methodText = normalize(`${method.label} ${method.accountName}`);
      const walletText = normalize(analysis.wallet);
      return Boolean(walletText && methodText.includes(walletText));
    });
    methodId = matchedMethod?.id || null;
  }

  const verificationStatus = autoVerified
    ? ("PAGADO_VERIFICADO" as const)
    : ("PENDIENTE" as const);

  const analysisJson = JSON.stringify({
    ...analysis,
    expectedAmount: order.totalAmount,
    matchesAmount,
    recipientMatches: recipientMatches || accountNumberMatches,
    autoVerified,
    methodId,
    source: "vision_comprobante",
    mediaId: input.mediaId || null,
    caption: input.caption || null,
  });

  await prisma.$transaction([
    prisma.paymentRecord.create({
      data: {
        orderId: order.id,
        amount: analysis.amount ?? order.totalAmount,
        currency: "BOB",
        provider,
        methodId,
        reference: analysis.reference || null,
        reportedByCustomer: true,
        receiptImageUrl: input.mediaId ? `whatsapp:${input.mediaId}` : null,
        receiptAnalysisJson: analysisJson,
        verificationStatus,
        verifiedBy: autoVerified ? "TropiGO IA (comprobante)" : null,
        verifiedAt: autoVerified ? new Date() : null,
      },
    }),
    prisma.order.update({
      where: { id: order.id },
      data: {
        paymentMethod: provider,
        paymentStatus: verificationStatus,
      },
    }),
    prisma.activityLog.create({
      data: {
        action: autoVerified
          ? "PAYMENT_AUTO_VERIFIED_RECEIPT"
          : "PAYMENT_RECEIPT_PENDING_REVIEW",
        entityName: "Order",
        entityId: order.id,
        provider: "tropigo_payments",
        channel: "whatsapp",
        status: autoVerified ? "success" : "warning",
        detailsJson: JSON.stringify({
          orderNumber: order.orderNumber,
          amount: analysis.amount,
          expectedAmount: order.totalAmount,
          wallet: walletLabel,
          reference: analysis.reference,
          confidence: analysis.confidence,
          recipientMatches: recipientMatches || accountNumberMatches,
          methodId,
          autoVerified,
        }),
      },
    }),
  ]);

  const amountText =
    analysis.amount != null ? `${analysis.amount.toFixed(2)} Bs.` : "monto no legible";

  if (autoVerified) {
    return {
      matched: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      expectedAmount: order.totalAmount,
      detectedAmount: analysis.amount,
      wallet: walletLabel,
      reference: analysis.reference,
      verificationStatus: "PAGADO_VERIFICADO",
      autoVerified: true,
      message:
        `Comprobante de ${walletLabel} por ${amountText} registrado y verificado automáticamente ` +
        `para el pedido ${order.orderNumber}. El monto y el titular coinciden.`,
    };
  }

  return {
    matched: true,
    orderId: order.id,
    orderNumber: order.orderNumber,
    expectedAmount: order.totalAmount,
    detectedAmount: analysis.amount,
    wallet: walletLabel,
    reference: analysis.reference,
    verificationStatus: "PENDIENTE",
    autoVerified: false,
    message:
      `Comprobante de ${walletLabel} por ${amountText} recibido para el pedido ${order.orderNumber}. ` +
      `Quedó PENDIENTE de verificación porque ` +
      (!matchesAmount
        ? `el monto no coincide exactamente con los ${order.totalAmount.toFixed(2)} Bs. del pedido`
        : !(recipientMatches || accountNumberMatches)
        ? "no se pudo confirmar el titular/cuenta de destino"
        : "la lectura no tiene confianza suficiente") +
      ". Un operador lo revisará.",
  };
}

/**
 * Convierte el resultado en un bloque de contexto para que la IA responda con
 * datos exactos y no invente estados de pago.
 */
export function buildReceiptPromptBlock(
  result: ReceiptRegistrationResult | null
): string {
  if (!result) return "";
  if (!result.matched) {
    return `[COMPROBANTE DE PAGO RECIBIDO]\n${result.message}\nNo afirmes que el pago fue verificado.`;
  }

  return (
    `[COMPROBANTE DE PAGO PROCESADO]\n` +
    `Pedido: ${result.orderNumber}. Monto del pedido: ${Number(
      result.expectedAmount || 0
    ).toFixed(2)} Bs. Monto detectado: ${
      result.detectedAmount != null
        ? `${result.detectedAmount.toFixed(2)} Bs.`
        : "no legible"
    }. Billetera: ${result.wallet || "no identificada"}. Referencia: ${
      result.reference || "sin referencia"
    }.\nEstado: ${
      result.verificationStatus === "PAGADO_VERIFICADO"
        ? "PAGO VERIFICADO"
        : "PENDIENTE DE VERIFICACIÓN MANUAL"
    }.\n${result.message}\n` +
    (result.verificationStatus === "PAGADO_VERIFICADO"
      ? "Informa al cliente que su pago fue confirmado y que su pedido sigue su curso."
      : "Informa al cliente que el comprobante fue recibido y que un operador lo verificará. No afirmes que ya está pagado.")
  );
}
