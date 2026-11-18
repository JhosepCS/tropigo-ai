import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  parseRiderPaymentQr,
  serializeRiderPaymentQr,
} from "@/lib/payments/rider";
import { generateAccessToken, riderAccessUrl } from "@/lib/access/tokens";

export const dynamic = "force-dynamic";

const VEHICLE_TYPES = ["MOTO", "TORITO_TRIMOVIL", "BICICLETA"];

function cleanQrImage(value: unknown): string {
  if (typeof value !== "string") return "";
  const raw = value.trim();
  if (!raw) return "";
  if (/^data:image\/(png|jpe?g|webp);base64,/i.test(raw)) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  return "";
}

function normalizePhone(phone: string): { e164: string; national: string } | null {
  const digits = String(phone || "").replace(/\D/g, "");
  const national = digits.startsWith("591") ? digits.slice(3) : digits;
  if (!/^\d{7,8}$/.test(national)) return null;
  return { e164: `+591${national}`, national };
}

/**
 * POST /api/public/registro/repartidor
 * Registro público de mototaxistas y repartidores. Quedan en
 * PENDIENTE_APROBACION hasta que un operador los valide en el CRM.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Honeypot anti-bots: si viene completo, se ignora silenciosamente.
    if (typeof body?.website === "string" && body.website.trim()) {
      return NextResponse.json({ success: true, pending: true });
    }

    const name = String(body?.name || "").trim().replace(/\s+/g, " ");
    if (name.length < 3 || name.length > 80) {
      return NextResponse.json(
        { error: "Escribe tu nombre completo (mínimo 3 caracteres)." },
        { status: 400 }
      );
    }

    const phoneInfo = normalizePhone(String(body?.phone || ""));
    if (!phoneInfo) {
      return NextResponse.json(
        {
          error:
            "Escribe un WhatsApp boliviano válido, por ejemplo +591 71234567.",
        },
        { status: 400 }
      );
    }

    const vehicleType = String(body?.vehicleType || "MOTO").toUpperCase();
    if (!VEHICLE_TYPES.includes(vehicleType)) {
      return NextResponse.json(
        { error: "Elige un tipo de vehículo válido." },
        { status: 400 }
      );
    }

    const existing = await prisma.rider.findFirst({
      where: {
        OR: [
          { phone: phoneInfo.e164 },
          { phone: phoneInfo.national },
        ],
      },
      select: { id: true, status: true },
    });
    if (existing) {
      return NextResponse.json(
        {
          error:
            "Ese WhatsApp ya está registrado. Si ya enviaste tu solicitud, espera la aprobación de TropiGO.",
          alreadyRegistered: true,
        },
        { status: 409 }
      );
    }

    const plateNumber =
      String(body?.plateNumber || "").trim().slice(0, 20) || "SIN PLACA";
    const vehicleModel = String(body?.vehicleModel || "").trim().slice(0, 60) || null;
    const vehicleColor = String(body?.vehicleColor || "").trim().slice(0, 40) || null;

    let paymentQrJson: string | null = null;
    const rawQr = body?.paymentQr;
    if (rawQr && typeof rawQr === "object") {
      const parsed = parseRiderPaymentQr(JSON.stringify(rawQr));
      if (parsed) {
        if (parsed.qrImage) {
          const safeImage = cleanQrImage(parsed.qrImage);
          if (!safeImage) {
            return NextResponse.json(
              {
                error:
                  "La imagen del QR debe ser PNG/JPG/WEBP o una URL https válida.",
              },
              { status: 400 }
            );
          }
          parsed.qrImage = safeImage;
        }
        if (
          parsed.label ||
          parsed.accountName ||
          parsed.accountNumber ||
          parsed.qrImage
        ) {
          paymentQrJson = serializeRiderPaymentQr(parsed);
        }
      }
    }

    const city = await prisma.city.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    const accessToken = generateAccessToken();

    const rider = await prisma.rider.create({
      data: {
        name,
        phone: phoneInfo.e164,
        cityId: city?.id || null,
        vehicleType,
        plateNumber,
        vehicleModel,
        vehicleColor,
        paymentQrJson,
        status: "PENDIENTE_APROBACION",
        isActive: false,
        isAvailable: false,
        registeredViaWeb: true,
        accessToken,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        vehicleType: true,
        status: true,
        accessToken: true,
        createdAt: true,
      },
    });

    await prisma.activityLog
      .create({
        data: {
          action: "RIDER_REGISTRATION_REQUEST",
          entityName: "Rider",
          entityId: rider.id,
          provider: "web",
          channel: "web",
          status: "success",
          detailsJson: JSON.stringify({
            name: rider.name,
            phone: rider.phone,
            vehicleType: rider.vehicleType,
            hasPaymentQr: Boolean(paymentQrJson),
          }),
        },
      })
      .catch(() => {});

    return NextResponse.json({
      success: true,
      pending: true,
      rider: {
        id: rider.id,
        name: rider.name,
        status: rider.status,
      },
      accessUrl: riderAccessUrl(rider.accessToken || accessToken),
      message:
        "Tu solicitud fue enviada. Un operador de TropiGO revisará tus datos y te avisará por WhatsApp cuando esté aprobada.",
    });
  } catch (error: any) {
    console.error("[Registro Repartidor] Error:", error);
    return NextResponse.json(
      {
        error:
          "No se pudo enviar tu registro en este momento. Intenta de nuevo en unos minutos.",
      },
      { status: 500 }
    );
  }
}
