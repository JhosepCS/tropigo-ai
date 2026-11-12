import { NextRequest, NextResponse } from "next/server";
import { getPaymentMethodById } from "@/lib/payments/service";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/payment-qr/[id]
 * Sirve la imagen del QR configurado para un método de pago.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const method = await getPaymentMethodById(id);

    if (!method || !method.enabled || !method.qrImage) {
      return NextResponse.json(
        { error: "QR de pago no configurado." },
        { status: 404 }
      );
    }

    if (/^https?:\/\//i.test(method.qrImage)) {
      return NextResponse.redirect(method.qrImage);
    }

    const match = method.qrImage.match(
      /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s
    );
    if (!match) {
      return NextResponse.json(
        { error: "Formato de QR no válido." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(match[2], "base64");
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": match[1],
        "Cache-Control": "public, max-age=300, s-maxage=300",
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    console.error("[PaymentQR] Error:", error);
    return NextResponse.json(
      { error: "No se pudo cargar el QR de pago." },
      { status: 500 }
    );
  }
}
