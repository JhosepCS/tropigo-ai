import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { MetaCloudApiAdapter } from "@/lib/whatsapp/meta-cloud-adapter";

/**
 * GET /api/webhooks/meta
 * Verificación obligatoria de Meta Webhook (hub.challenge)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const config = await prisma.whatsAppConfig.findFirst();
  const verifyToken =
    config?.metaWebhookVerifyToken ||
    process.env.META_WEBHOOK_VERIFY_TOKEN ||
    "tropigo_verify_token_2025";

  if (mode === "subscribe" && token === verifyToken) {
    console.log("✅ Meta Webhook verificado con éxito");
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Token de verificación inválido", { status: 403 });
}

/**
 * POST /api/webhooks/meta
 * Recepción de mensajes y eventos de Meta WhatsApp Cloud API
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");

    const config = await prisma.whatsAppConfig.findFirst();
    const appSecret = config?.metaAppSecretEncrypted
      ? decrypt(config.metaAppSecretEncrypted)
      : process.env.META_APP_SECRET;

    // Validación de seguridad de la firma si el App Secret está configurado
    if (appSecret && !MetaCloudApiAdapter.validateSignature(rawBody, signature, appSecret)) {
      console.warn("⚠️ Firma de Webhook de Meta inválida. Solicitud descartada.");
      return new NextResponse("Firma inválida", { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const messages = MetaCloudApiAdapter.parseWebhookMessages(payload);

    for (const msg of messages) {
      console.log(`📩 Mensaje entrante de Meta [${msg.from}] Tipo: ${msg.type}`);

      // 1. Obtener o crear cliente
      let customer = await prisma.customer.findUnique({
        where: { phone: msg.from },
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            phone: msg.from,
            name: `Cliente WhatsApp`,
          },
        });
      }

      // 2. Obtener o crear conversación activa
      let conversation = await prisma.conversation.findFirst({
        where: {
          customerId: customer.id,
          channel: "WHATSAPP",
          status: { in: ["AI_ACTIVE", "HUMAN_TAKEOVER"] },
        },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            customerId: customer.id,
            channel: "WHATSAPP",
            status: "AI_ACTIVE",
          },
        });
      }

      // 3. Guardar mensaje recibido en BD
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          sender: "CUSTOMER",
          content: msg.text || (msg.type === "location" ? "📍 [Ubicación compartida]" : "🎤 [Nota de voz]"),
          mediaType: msg.type,
          latitude: msg.location?.latitude,
          longitude: msg.location?.longitude,
          rawPayload: JSON.stringify(msg.raw),
        },
      });

      // Si compartió ubicación GPS, guardarla en el cliente
      if (msg.location) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            savedLatitude: msg.location.latitude,
            savedLongitude: msg.location.longitude,
            defaultAddress: msg.location.address || msg.location.name || customer.defaultAddress,
          },
        });
      }
    }

    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  } catch (error) {
    console.error("Error al procesar webhook de Meta:", error);
    return new NextResponse("Error interno", { status: 500 });
  }
}
