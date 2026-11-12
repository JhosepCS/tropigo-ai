import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireRole,
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/auth/rbac";
import {
  parseRiderPaymentQr,
  serializeRiderPaymentQr,
} from "@/lib/payments/rider";

export const dynamic = "force-dynamic";

function cleanQrImage(value: unknown): string {
  if (typeof value !== "string") return "";
  const raw = value.trim();
  if (!raw) return "";
  if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(raw)) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  return "";
}

/**
 * POST /api/admin/riders/[id]/payment-qr
 * Guarda el QR personal de cobro del repartidor (Tigo Money, Yape, ZAS,
 * Altoke, QR bancario, etc.). Solo administración/operación.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["SUPERADMIN", "ADMIN", "OPERATOR"]);

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const raw = body?.paymentQr ?? body;

    const rider = await prisma.rider.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!rider) {
      return NextResponse.json(
        { error: "No encontramos el repartidor." },
        { status: 404 }
      );
    }

    const parsed = parseRiderPaymentQr(JSON.stringify(raw));

    // Sin datos: se elimina el QR de cobro.
    if (!parsed) {
      await prisma.rider.update({
        where: { id },
        data: { paymentQrJson: null },
      });
      return NextResponse.json({ success: true, paymentQr: null });
    }

    if (parsed.qrImage) {
      const safeImage = cleanQrImage(parsed.qrImage);
      if (!safeImage) {
        return NextResponse.json(
          {
            error:
              "La imagen del QR debe ser un archivo PNG/JPG/WEBP o una URL https válida.",
          },
          { status: 400 }
        );
      }
      parsed.qrImage = safeImage;
    }

    if (!parsed.label && !parsed.accountName && !parsed.accountNumber && !parsed.qrImage) {
      return NextResponse.json(
        { error: "Completa al menos el nombre de la billetera o el QR." },
        { status: 400 }
      );
    }

    const updated = await prisma.rider.update({
      where: { id },
      data: { paymentQrJson: serializeRiderPaymentQr(parsed) },
      select: { id: true, name: true, paymentQrJson: true },
    });

    return NextResponse.json({ success: true, rider: updated });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[Rider Payment QR] Error:", error);
    return NextResponse.json(
      { error: "No se pudo guardar el QR del repartidor." },
      { status: 500 }
    );
  }
}
