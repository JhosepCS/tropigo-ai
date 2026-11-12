import { NextResponse } from "next/server";
import { getEnabledPaymentMethods } from "@/lib/payments/service";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/payment-methods
 * Lista pública de métodos habilitados. No incluye datos internos.
 */
export async function GET() {
  try {
    const methods = await getEnabledPaymentMethods();
    return NextResponse.json({
      success: true,
      methods: methods.map((method) => ({
        id: method.id,
        label: method.label,
        type: method.type,
        emoji: method.emoji,
        accountName: method.accountName,
        accountNumber: method.accountNumber,
        instructions: method.instructions,
        hasQr: Boolean(method.qrImage),
        qrUrl: method.qrImage
          ? `/api/public/payment-qr/${encodeURIComponent(method.id)}`
          : null,
      })),
    });
  } catch (error) {
    console.error("[PublicPaymentMethods] Error:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar los métodos de pago." },
      { status: 500 }
    );
  }
}
