import { prisma } from "../lib/prisma";
import { runAgentChat } from "../lib/ai/agent";
import { analyzeImage, transcribeAudio, analyzePaymentReceipt, ReceiptAnalysis } from "../lib/ai/multimodal";
import { getAssistantConfig, buildSystemPrompt } from "../lib/ai/config-manager";
import { getRealDataContextPrompt } from "../lib/ai/tools";
import { buildCustomerMemoryPrompt } from "../lib/memory/customer-memory";
import { ensureConversationSession } from "../lib/memory/conversation-summary";
import { buildCustomerLocationPrompt } from "../lib/geo/delivery-center";
import { reverseGeocode } from "../lib/geo/reverse-geocode";
import { decodeLoyaltyQrFromImage } from "../lib/loyalty/qr-decode";
import {
  buildReceiptPromptBlock,
  registerReceiptPayment,
} from "../lib/payments/receipt-service";
import {
  buildLoyaltyCardPrompt,
  buildCustomerLoyaltyPrompt,
} from "../lib/loyalty/prompt";
import { extractLoyaltyCode } from "../lib/loyalty/code";
import { BaileysAdapter } from "../lib/whatsapp/baileys-adapter";
import { MediaDownloader } from "../lib/whatsapp/media-downloader";
import { isSafeExplicitConfirmation } from "../lib/orders/confirmation";
import { confirmAndCreateOrder } from "../lib/orders/order-service";
import { sanitizeAssistantReply } from "../lib/ai/response-format";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import http from "http";
import pino from "pino";

const sessionDir = process.env.WHATSAPP_SESSION_DIR || "./data/whatsapp_session";
const BATCH_DELAY_MS = Number(process.env.WHATSAPP_BATCH_DELAY_MS || 2500);
const AI_AUTO_RESUME_SECONDS = Math.max(
  5,
  Number(process.env.AI_AUTO_RESUME_SECONDS || 17)
);
const PERSIST_SESSION =
  process.env.WHATSAPP_SESSION_PERSIST === "true" ||
  process.env.NODE_ENV === "production";

type BatchItem = {
  kind: string;
  text: string;
  raw: any;
  location?: any;
  profileName?: string;
};

type MessageBuffer = {
  jid: string;
  phone: string;
  timer: NodeJS.Timeout;
  items: BatchItem[];
};

const messageBuffer: Record<string, MessageBuffer> = {};
const processedIds = new Map<string, number>();
const autoResumeAttempts = new Map<string, { count: number; firstAt: number }>();

// Evita que el temporizador de 17 s y el barrido cada 5 s respondan dos veces
// el mismo chat al mismo tiempo.
const autoResumeInFlight = new Set<string>();

/**
 * Evita bucles: si la IA vuelve a pedir un humano, no se reanuda más de dos
 * veces en 10 minutos para el mismo chat.
 */
function registerAutoResume(conversationId: string): boolean {
  const now = Date.now();
  const entry = autoResumeAttempts.get(conversationId);
  if (!entry || now - entry.firstAt > 10 * 60 * 1000) {
    autoResumeAttempts.set(conversationId, { count: 1, firstAt: now });
    return true;
  }
  if (entry.count >= 2) return false;
  entry.count += 1;
  return true;
}

let backgroundJobsStarted = false;
let reconnectTimer: NodeJS.Timeout | null = null;
let connectInProgress = false;
let activeSock: any = null;

function scheduleReconnect(delayMs = 5000) {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectBaileys().catch((error) => {
      connectInProgress = false;
      console.error("[Worker] Fallo al reconectar:", error);
      scheduleReconnect(10_000);
    });
  }, delayMs);
}

function normalizePhone(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  return digits ? `+${digits}` : raw;
}

function isDuplicate(messageId: string): boolean {
  if (!messageId) return false;
  const now = Date.now();
  const seen = processedIds.get(messageId);
  if (seen && now - seen < 10 * 60 * 1000) return true;
  processedIds.set(messageId, now);
  return false;
}

function cleanupProcessedIds() {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [id, timestamp] of processedIds.entries()) {
    if (timestamp < cutoff) processedIds.delete(id);
  }
}

function readAuthFiles(): Record<string, string> {
  const files: Record<string, string> = {};
  if (!fs.existsSync(sessionDir)) return files;

  for (const name of fs.readdirSync(sessionDir)) {
    if (!name.endsWith(".json")) continue;
    if (!/^[A-Za-z0-9._-]+$/.test(name)) continue;
    // No persistir ratchets efímeros de chats individuales para evitar 'Bad MAC' por desincronización
    if (name.startsWith("session-")) continue;

    const fullPath = path.join(sessionDir, name);
    try {
      const stat = fs.statSync(fullPath);
      if (!stat.isFile() || stat.size > 2_000_000) continue;
      files[name] = fs.readFileSync(fullPath, "utf8");
    } catch {
      // Ignorar archivos que estén siendo escritos en este instante.
    }
  }

  return files;
}

/**
 * Restaura las credenciales de Baileys desde Supabase. Esto permite que el
 * worker viva en un hosting efímero (Render/Railway/Fly) sin perder la sesión
 * de WhatsApp ni tener que escanear el QR en cada reinicio.
 */
async function restoreBaileysSession() {
  if (!PERSIST_SESSION) return;

  try {
    const channel = await prisma.channel.findUnique({ where: { type: "whatsapp" } });
    if (!channel?.settingsJson) return;

    const settings = JSON.parse(channel.settingsJson);
    const files = settings?.baileysAuth;
    if (!files || typeof files !== "object") return;

    fs.mkdirSync(sessionDir, { recursive: true });
    let restored = 0;

    for (const [name, content] of Object.entries(files)) {
      if (typeof content !== "string") continue;
      if (!/^[A-Za-z0-9._-]+$/.test(name) || !name.endsWith(".json")) continue;
      // No restaurar sesiones de contacto individuales (ratchets) para evitar 'Bad MAC' por desincronización
      if (name.startsWith("session-")) continue;
      fs.writeFileSync(path.join(sessionDir, name), content, "utf8");
      restored++;
    }

    if (restored > 0) {
      console.log(`[Worker] Sesión de WhatsApp restaurada desde Supabase (${restored} archivos).`);
    }
  } catch (error) {
    console.error("[Worker] No se pudo restaurar la sesión de WhatsApp:", error);
  }
}

/**
 * Guarda las credenciales de Baileys en Supabase. Se llama con debounce
 * porque Baileys emite creds.update varias veces por minuto.
 */
async function persistBaileysSession() {
  if (!PERSIST_SESSION) return;

  try {
    const files = readAuthFiles();
    if (Object.keys(files).length === 0) return;

    const channel = await prisma.channel.findUnique({ where: { type: "whatsapp" } });
    let settings: any = {};
    try {
      settings = channel?.settingsJson ? JSON.parse(channel.settingsJson) : {};
    } catch {
      settings = {};
    }

    settings.baileysAuth = files;
    settings.baileysAuthUpdatedAt = new Date().toISOString();

    await prisma.channel.upsert({
      where: { type: "whatsapp" },
      update: { settingsJson: JSON.stringify(settings) },
      create: { type: "whatsapp", settingsJson: JSON.stringify(settings) },
    });
  } catch (error) {
    console.error("[Worker] No se pudo persistir la sesión de WhatsApp:", error);
  }
}

let persistTimer: NodeJS.Timeout | null = null;

function scheduleSessionPersist() {
  if (!PERSIST_SESSION) return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    persistBaileysSession().catch(() => {});
  }, 2500);
}

function extractSenderPhone(message: any): string {
  const remoteJid = message.key?.remoteJid || "";
  const altJid = message.key?.remoteJidAlt || "";
  const phoneJid = altJid.endsWith("@s.whatsapp.net") ? altJid : remoteJid;
  const digits = phoneJid.split("@")[0].replace(/\D/g, "");
  if (digits) return digits;
  return remoteJid.split("@")[0] || "desconocido";
}

type QuickIntent = "menu" | "market" | "taxi" | "gps" | "human";

/**
 * Normaliza el texto del cliente para reconocer atajos aunque escriba con
 * emojis, acentos, mayúsculas o "opción 1". Así el mismo mensaje se asocia
 * siempre a su chat y a la acción correcta.
 */
function normalizeIntentText(text: string): string {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/([0-9])\ufe0f?\u20e3/g, "$1")
    .replace(/[^a-z0-9#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectQuickIntent(text: string): QuickIntent | null {
  const normalized = normalizeIntentText(text);
  if (!normalized) return null;

  const cleaned = normalized
    .replace(/^(opcion|el|la|numero|nro|inciso)\s+/, "")
    .trim();

  const byNumber: Record<string, QuickIntent> = {
    "1": "menu",
    "2": "market",
    "3": "taxi",
    "4": "gps",
    "5": "human",
  };
  if (byNumber[cleaned]) return byNumber[cleaned];
  if (byNumber[normalized]) return byNumber[normalized];

  const first = cleaned.split(" ")[0];
  const aliases: Record<string, QuickIntent> = {
    menu: "menu",
    carta: "menu",
    precios: "menu",
    comida: "menu",
    restaurante: "menu",
    restaurantes: "menu",
    market: "market",
    mercado: "market",
    tienda: "market",
    abarrotes: "market",
    super: "market",
    supermercado: "market",
    taxi: "taxi",
    mototaxi: "taxi",
    moto: "taxi",
    torito: "taxi",
    carrera: "taxi",
    viaje: "taxi",
    ubicacion: "gps",
    gps: "gps",
    humano: "human",
    operador: "human",
    operadora: "human",
    persona: "human",
    reclamo: "human",
  };

  return aliases[first] || null;
}

function isPureGreeting(text: string): boolean {
  const normalized = normalizeIntentText(text);
  if (!normalized) return false;
  const words = normalized.split(" ");
  if (words.length > 3) return false;

  return /^(hola+|buenas|buenos|buen dia|buenos dias|buenas tardes|buenas noches|hey|saludos|inicio|empezar|ayuda|info|informacion|tropibot|tropigo)$/.test(
    normalized
  ) || /^(hola|buenas)\s+(tropibot|tropigo|amigo|buenas)$/.test(normalized);
}

function buildQuickMenu(): string {
  return (
    "🌴 *TropiGO*\n" +
    "1️⃣ Menú y precios 🍔\n" +
    "2️⃣ Market 🛒\n" +
    "3️⃣ TropiTaxi 🛵\n" +
    "4️⃣ Enviar ubicación 📍\n" +
    "5️⃣ Hablar con operador 👤\n\n" +
    "_Responde con el número de tu opción._"
  );
}

function buildQuickReply(intent: QuickIntent): {
  text: string;
  handoff: boolean;
} {
  switch (intent) {
    case "menu":
      return {
        handoff: false,
        text:
          "🍔 *Menú de hoy*\n" +
          "• Broaster 18 Bs\n" +
          "• Hamburguesa 25 Bs\n" +
          "• Silpancho 20 Bs\n" +
          "• Pique macho 45 Bs\n\n" +
          "¿Cuál quieres? Fotos: https://tropigo-ai.vercel.app/pedir",
      };
    case "market":
      return {
        handoff: false,
        text:
          "🛒 *TropiGO Market*\n" +
          "Abarrotes, bebidas, lácteos y carnes frescas.\n" +
          "Catálogo: https://tropigo-ai.vercel.app/pedir\n\n" +
          "¿Qué necesitas?",
      };
    case "taxi":
      return {
        handoff: false,
        text:
          "🛵 *TropiTaxi*\n" +
          "Moto 10 Bs · Torito 15 Bs.\n\n" +
          "Dime: ¿desde dónde y hacia dónde vas?",
      };
    case "gps":
      return {
        handoff: false,
        text:
          "📍 *Tu ubicación*\n" +
          "Abre el clip 📎 o el (+), elige *Ubicación* y toca *Enviar mi ubicación actual*.\n\n" +
          "Así te encontramos rápido.",
      };
    case "human":
    default:
      return {
        handoff: true,
        text:
          "👤 *Operador humano*\n" +
          "Pausé mis respuestas y avisé al equipo de despacho.\n" +
          "Si no responden en 17 segundos, retomo la atención automáticamente.",
      };
  }
}

/**
 * Compuerta de confirmación del canal Baileys.
 *
 * Replica la regla del webhook de Meta: el pedido solo se crea si el cliente
 * confirmó explícitamente, existe una cotización pendiente y el resumen ya fue
 * mostrado. El modelo de IA no puede autorizar un pedido por sí solo.
 */
async function tryConfirmPendingOrder(
  customerId: string,
  conversationId: string
) {
  const pendingQuote = await prisma.orderQuote.findFirst({
    where: {
      customerId,
      conversationId,
      status: "PENDIENTE",
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!pendingQuote) return null;

  const summaryShown = Boolean(
    await prisma.message.findFirst({
      where: {
        conversationId,
        sender: "ASSISTANT",
        createdAt: { gte: pendingQuote.createdAt },
        OR: [
          { content: { contains: "RESUMEN DE TU PEDIDO" } },
          { content: { contains: pendingQuote.totalAmount.toFixed(2) } },
        ],
      },
      select: { id: true },
    })
  );

  const lastAssistantMessage = await prisma.message.findFirst({
    where: { conversationId, sender: "ASSISTANT" },
    orderBy: { createdAt: "desc" },
    select: { content: true },
  });

  const askedConfirmation = Boolean(
    lastAssistantMessage && /confirm/i.test(lastAssistantMessage.content)
  );

  if (!summaryShown || !askedConfirmation) return null;

  return confirmAndCreateOrder(
    { quoteId: pendingQuote.id },
    {
      customerId,
      conversationId,
      confirmationVerified: true,
      source: "WHATSAPP",
    }
  );
}

async function getOrCreateCustomer(phone: string, profileName?: string) {
  const e164 = normalizePhone(phone);
  const digits = phone.replace(/\D/g, "");

  let customer = await prisma.customer.findFirst({
    where: {
      OR: [
        { phone: e164 },
        { phone },
        ...(digits ? [{ phone: digits }] : []),
      ],
    },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        phone: e164,
        name: profileName?.trim() || `Cliente WhatsApp (${e164})`,
      },
    });
  } else if (
    profileName?.trim() &&
    (!customer.name || customer.name.startsWith("Cliente WhatsApp"))
  ) {
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: { name: profileName.trim() },
    });
  }

  return customer;
}

async function buildUserContent(sock: any, items: BatchItem[]) {
  const parts: string[] = [];
  let mediaType = "text";
  let transcription: string | null = null;
  let location: { latitude: number; longitude: number } | null = null;
  let locationLabel: string | null = null;
  const receiptAnalyses: ReceiptAnalysis[] = [];

  for (const item of items) {
    if (item.kind === "text") {
      if (item.text?.trim()) parts.push(item.text.trim());
      continue;
    }

    if (item.kind === "location" && item.location) {
      location = {
        latitude: item.location.latitude,
        longitude: item.location.longitude,
      };
      locationLabel =
        item.location.address?.trim() ||
        (await reverseGeocode(
          item.location.latitude,
          item.location.longitude
        )) ||
        null;
      parts.push(
        `[Ubicación GPS compartida: Lat ${item.location.latitude}, Lng ${item.location.longitude}` +
          `${locationLabel ? ` - ${locationLabel}` : ""}]`
      );
      continue;
    }

    if (item.kind === "audio" || item.kind === "image" || item.kind === "document") {
      mediaType = item.kind;
      const media = await MediaDownloader.download(sock, item.raw);

      if (!media) {
        if (item.kind === "audio") {
          parts.push(
            "[Nota de voz que no se pudo descargar. Discúlpate y pide al cliente que repita o escriba.]"
          );
        } else if (item.kind === "image") {
          parts.push(
            "[Imagen que no se pudo descargar. Discúlpate y pide al cliente que describa lo que necesita.]"
          );
        } else {
          parts.push(`[Documento: ${item.text || "adjunto"}]`);
        }
        continue;
      }

      if (item.kind === "audio") {
        const result = await transcribeAudio(media.buffer, media.mimeType);
        if (result.text) {
          transcription = result.text;
          parts.push(`[Nota de voz transcrita literalmente]: "${result.text}"`);
        } else {
          parts.push(
            "[Nota de voz que no se pudo transcribir. Discúlpate y pide al cliente que repita o escriba.]"
          );
        }
      } else if (item.kind === "image") {
        const decodedQr = await decodeLoyaltyQrFromImage(media.buffer);
        const loyaltyBlock = decodedQr
          ? await buildLoyaltyCardPrompt(decodedQr.code)
          : null;
        const result = await analyzeImage(media.buffer, media.mimeType, item.text);
        const receiptHints =
          /comprobante|pago|transferencia|tigo|yape|zas|altoke|qr|monto|banco|referencia/i;
        if (
          receiptHints.test(`${item.text || ""} ${result.text || ""}`)
        ) {
          receiptAnalyses.push(
            await analyzePaymentReceipt(media.buffer, media.mimeType)
          );
        }
        if (result.text) {
          parts.push(
            `${item.text ? `El cliente escribió: "${item.text}".\n` : ""}` +
              `Contenido detectado en la imagen: ${result.text}`
          );
        } else {
          parts.push(
            "[Imagen que no se pudo analizar. Discúlpate y pide al cliente que describa lo que necesita.]"
          );
        }
        if (loyaltyBlock) parts.push(loyaltyBlock);
      } else {
        parts.push(`[Documento: ${item.text || "adjunto"}]`);
      }
    }
  }

  return {
    content: parts.join("\n").trim(),
    mediaType,
    transcription,
    location,
    locationLabel,
    receiptAnalyses,
  };
}

/**
 * Construye el JID correcto para responder. Los LID de WhatsApp tienen 14-15
 * dígitos; los teléfonos internacionales, hasta 13.
 */
function buildJidForPhone(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.length >= 14 ? `${digits}@lid` : `${digits}@s.whatsapp.net`;
}

function extractJidFromPayload(raw: string | null): string | null {
  try {
    const parsed = raw ? JSON.parse(raw) : {};
    const jid = typeof parsed?.jid === "string" ? parsed.jid : "";
    return jid.includes("@") ? jid : null;
  } catch {
    return null;
  }
}

async function processBatch(
  sock: any,
  jid: string,
  phone: string,
  items: BatchItem[],
  options: { skipCustomerPersist?: boolean; autoResumed?: boolean } = {}
) {
  try {
    const business = await prisma.businessProfile.findFirst();

    const profileName = items.find((item) => item.profileName)?.profileName;
    const customer = await getOrCreateCustomer(phone, profileName);
    const conversation = await ensureConversationSession(customer.id, "WHATSAPP");

    // Aunque el asistente esté apagado, el mensaje debe guardarse para que el
    // chat aparezca en el CRM y un operador pueda responderlo.
    if (business && !business.assistantEnabled) {
      if (!options.skipCustomerPersist) {
        const rawText =
          items
            .map((item) => item.text?.trim())
            .filter(Boolean)
            .join("\n") || "[Mensaje multimedia]";

        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            sender: "CUSTOMER",
            content: rawText,
            mediaType: items.some((item) => item.kind !== "text")
              ? items[0].kind
              : "text",
            rawPayload: JSON.stringify({
              source: "baileys",
              jid,
              messageIds: items
                .map((item) => item.raw?.key?.id)
                .filter(Boolean),
            }),
          },
        });
      }
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });
      return;
    }

    if (conversation.status === "HUMAN_TAKEOVER") {
      const firstText = normalizeIntentText(items[0]?.text || "");
      if (
        firstText === "#ia" ||
        firstText === "#bot" ||
        firstText === "reanudar" ||
        firstText === "activar ia"
      ) {
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { status: "AI_ACTIVE" },
        });
        await sock.sendMessage(jid, {
          text: "🤖 *TropiBot reactivado.* ¿En qué te ayudo? Escribe *menú* para ver las opciones.",
        });
        return;
      }

      // Guardar el mensaje del cliente aunque el operador tenga el control.
      // Así el CRM siempre muestra el mensaje en el chat correcto.
      const rawText =
        items
          .map((item) => item.text?.trim())
          .filter(Boolean)
          .join("\n") || "[Mensaje multimedia]";

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          sender: "CUSTOMER",
          content: rawText,
          mediaType: items.some((item) => item.kind !== "text")
            ? items[0].kind
            : "text",
          rawPayload: JSON.stringify({
            source: "baileys",
            jid,
            messageIds: items
              .map((item) => item.raw?.key?.id)
              .filter(Boolean),
          }),
        },
      });
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });

      // Reanudación automática: si el operador no responde en
      // AI_AUTO_RESUME_SECONDS (17 s por defecto), TropiBot retoma el chat.
      setTimeout(async () => {
        if (autoResumeInFlight.has(conversation.id)) return;
        autoResumeInFlight.add(conversation.id);
        try {
          const fresh = await prisma.conversation.findUnique({
            where: { id: conversation.id },
            select: { status: true },
          });
          if (!fresh || fresh.status !== "HUMAN_TAKEOVER") return;

          const business = await prisma.businessProfile.findFirst({
            select: { assistantEnabled: true },
          });
          if (business && !business.assistantEnabled) return;

          const lastMessage = await prisma.message.findFirst({
            where: { conversationId: conversation.id },
            orderBy: { createdAt: "desc" },
            select: { sender: true, createdAt: true },
          });
          if (!lastMessage || lastMessage.sender !== "CUSTOMER") return;

          const operatorReply = await prisma.message.findFirst({
            where: {
              conversationId: conversation.id,
              sender: "OPERATOR",
              createdAt: { gte: lastMessage.createdAt },
            },
            select: { id: true },
          });
          if (operatorReply) return;
          if (!registerAutoResume(conversation.id)) return;

          await prisma.conversation.update({
            where: { id: conversation.id },
            data: { status: "AI_ACTIVE" },
          });
          await prisma.handoffHistory
            .create({
              data: {
                conversationId: conversation.id,
                reason: `Sin respuesta del operador en ${AI_AUTO_RESUME_SECONDS} segundos. TropiBot retomó la atención.`,
                action: "AUTO_RESUME",
              },
            })
            .catch(() => {});

          await processBatch(sock, jid, phone, items, {
            skipCustomerPersist: true,
            autoResumed: true,
          });
        } catch (resumeError: any) {
          console.error(
            "[Worker] No se pudo reanudar la IA automáticamente:",
            resumeError?.message || resumeError
          );
        } finally {
          autoResumeInFlight.delete(conversation.id);
        }
      }, AI_AUTO_RESUME_SECONDS * 1000);

      console.log(
        `[Worker] Chat ${conversation.id} en atención humana. TropiBot retomará en ${AI_AUTO_RESUME_SECONDS}s si no hay respuesta.`
      );
      return;
    }

    let { content, mediaType, transcription, location, locationLabel, receiptAnalyses } =
      await buildUserContent(sock, items);

    if (!content) return;

    if (location) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          savedLatitude: location.latitude,
          savedLongitude: location.longitude,
          ...(locationLabel ? { lastLocationLabel: locationLabel } : {}),
        },
      });
    }

    for (const analysis of receiptAnalyses) {
      if (!analysis.isReceipt) continue;
      try {
        const receiptResult = await registerReceiptPayment({
          customerId: customer.id,
          analysis,
        });
        const receiptBlock = buildReceiptPromptBlock(receiptResult);
        if (receiptBlock) {
          content = `${content}\n\n${receiptBlock}`;
        }
      } catch (receiptError: any) {
        console.error(
          "[Worker] No se pudo registrar el comprobante:",
          receiptError?.message || receiptError
        );
      }
    }

    const typedLoyaltyCode = extractLoyaltyCode(content);
    if (typedLoyaltyCode && !content.includes("[TARJETA DE FIDELIDAD DETECTADA")) {
      const loyaltyBlock = await buildLoyaltyCardPrompt(typedLoyaltyCode);
      if (loyaltyBlock) {
        content = `${content}\n\n${loyaltyBlock}`;
      }
    }

    if (!options.skipCustomerPersist) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          sender: "CUSTOMER",
          content,
          mediaType,
          transcription,
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
          rawPayload: JSON.stringify({
            source: "baileys",
            jid,
            messageIds: items.map((item) => item.raw?.key?.id).filter(Boolean),
          }),
        },
      });
    }

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    // =========================================================================
    // ATAJOS RÁPIDOS (0 tokens), SALUDO Y CONFIRMACIÓN DE PEDIDO
    // =========================================================================
    // Se evalúa solo lo que escribió el cliente, no los bloques técnicos que
    // agrega el sistema (comprobantes, fidelidad, etc.).
    const customerText = items
      .map((item) => item.text?.trim())
      .filter(Boolean)
      .join("\n")
      .trim();

    const intent = detectQuickIntent(customerText);

    if (intent) {
      const quick = buildQuickReply(intent);
      await sock.sendMessage(jid, { text: quick.text });
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          sender: "ASSISTANT",
          content: quick.text,
          providerModel: "quick-action/instant",
          tokensUsed: 0,
          latencyMs: 15,
        },
      });
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(),
          ...(quick.handoff ? { status: "HUMAN_TAKEOVER" } : {}),
        },
      });
      if (quick.handoff) {
        await prisma.handoffHistory
          .create({
            data: {
              conversationId: conversation.id,
              reason: "Cliente seleccionó opción 5 (Atención Humana) en WhatsApp.",
              action: "TAKEOVER",
            },
          })
          .catch(() => {});
      }
      return;
    }

    // Saludo simple: menú instantáneo, sin gastar tokens ni esperar al modelo.
    if (isPureGreeting(customerText)) {
      const menu = buildQuickMenu();
      await sock.sendMessage(jid, { text: menu });
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          sender: "ASSISTANT",
          content: menu,
          providerModel: "quick-action/greeting",
          tokensUsed: 0,
          latencyMs: 5,
        },
      });
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });
      return;
    }

    // Confirmación explícita: el pedido se crea en el servidor, no por el
    // modelo. Esta es la pieza que faltaba en el canal Baileys.
    if (isSafeExplicitConfirmation(customerText)) {
      const creation = await tryConfirmPendingOrder(customer.id, conversation.id);
      if (creation) {
        const confirmationReply = creation.exitoso
          ? creation.mensajeConfirmacion ||
            `Tu pedido ${creation.orderNumber} fue registrado correctamente.`
          : `No pude registrar el pedido: ${
              creation.error ||
              "intenta nuevamente o solicita ayuda a un operador."
            }`;

        const safeReply = sanitizeAssistantReply(confirmationReply, {
          allowLong: true,
        });

        await sock.sendMessage(jid, { text: safeReply });
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            sender: "ASSISTANT",
            content: safeReply,
            toolCallsJson: JSON.stringify([
              {
                tool: "registrar_pedido",
                args: { quoteId: "confirmacion-canal" },
                result: creation,
              },
            ]),
          },
        });
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { lastMessageAt: new Date() },
        });
        return;
      }
    }

    try {
      await sock.sendPresenceUpdate("composing", jid);
    } catch {}

    const assistantConfig = await getAssistantConfig();
    const [realDataContext, memoryContext, loyaltyContext, locationContext] = await Promise.all([
      getRealDataContextPrompt(),
      buildCustomerMemoryPrompt(customer.id),
      buildCustomerLoyaltyPrompt(customer.id),
      buildCustomerLocationPrompt(customer.id),
    ]);
    const systemPrompt = buildSystemPrompt(
      assistantConfig,
      [realDataContext, memoryContext, loyaltyContext, locationContext]
        .filter(Boolean)
        .join("\n\n")
    );

    const recentMessages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: 6,
    });

    const chatHistory = recentMessages.reverse().map((m) => ({
      role:
        m.sender === "CUSTOMER"
          ? ("user" as const)
          : m.sender === "ASSISTANT"
          ? ("assistant" as const)
          : ("user" as const),
      content: m.content,
    }));

    const aiResponse = await runAgentChat({
      messages: [{ role: "system", content: systemPrompt }, ...chatHistory],
      config: assistantConfig,
      toolContext: {
        customerId: customer.id,
        conversationId: conversation.id,
        confirmationVerified: false,
        source: "WHATSAPP",
      },
      maxToolRounds: 2,
    });

    const rawReply =
      aiResponse.content?.trim() ||
      "¿En qué te ayudo? Escribe *menú* para ver las opciones.";

    // Respuesta breve y sin líneas repetidas. Los resúmenes de pedido se
    // conservan completos; las conversaciones normales se recortan.
    const reply = sanitizeAssistantReply(rawReply) || buildQuickMenu();

    await sock.sendMessage(jid, { text: reply });

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: "ASSISTANT",
        content: reply,
        toolCallsJson: aiResponse.toolCalls?.length
          ? JSON.stringify(aiResponse.toolCalls)
          : null,
        providerModel: `${aiResponse.provider}/${aiResponse.model}`,
        tokensUsed: aiResponse.tokensUsed || null,
        latencyMs: aiResponse.latencyMs || null,
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    if (aiResponse.operatorHandoff) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { status: "HUMAN_TAKEOVER" },
      });
      await prisma.handoffHistory.create({
        data: {
          conversationId: conversation.id,
          reason: "Solicitud de atención humana o reclamo detectado por el asistente.",
          action: "TAKEOVER",
        },
      });
    }
  } catch (error: any) {
    console.error("[Worker] Error procesando mensaje:", error);
    try {
      await sock.sendMessage(jid, {
        text:
          "Ups, no pude procesar tu mensaje. Escribe *menú* para ver las opciones " +
          "o intenta de nuevo en unos segundos.",
      });
    } catch {}
  }
}

/**
 * Barrido de seguridad: si el worker se reinició o un chat quedó en atención
 * humana con un mensaje del cliente sin responder, TropiBot retoma la atención
 * después de AI_AUTO_RESUME_SECONDS. Solo actúa sobre mensajes recientes para
 * no responder conversaciones viejas.
 */
async function resumeAbandonedTakeovers() {
  if (!activeSock) return;

  // Si el asistente está apagado desde Ajustes, no se reanuda nada.
  const business = await prisma.businessProfile.findFirst({
    select: { assistantEnabled: true },
  });
  if (business && !business.assistantEnabled) return;

  const cutoff = new Date(Date.now() - AI_AUTO_RESUME_SECONDS * 1000);
  const floor = new Date(Date.now() - 5 * 60 * 1000);

  const candidates = await prisma.conversation.findMany({
    where: {
      status: "HUMAN_TAKEOVER",
      lastMessageAt: { lt: cutoff, gt: floor },
    },
    orderBy: { lastMessageAt: "asc" },
    take: 10,
    include: { customer: true },
  });

  for (const conversation of candidates) {
    const customer = conversation.customer;
    if (!customer) continue;
    if (autoResumeInFlight.has(conversation.id)) continue;

    const lastMessage = await prisma.message.findFirst({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
    });
    if (!lastMessage || lastMessage.sender !== "CUSTOMER") continue;
    if (!lastMessage.content || lastMessage.content.length > 800) continue;
    // Solo si el mensaje ya superó la ventana de auto-reanudación.
    if (
      Date.now() - lastMessage.createdAt.getTime() <
      AI_AUTO_RESUME_SECONDS * 1000
    ) {
      continue;
    }

    const operatorReply = await prisma.message.findFirst({
      where: {
        conversationId: conversation.id,
        sender: "OPERATOR",
        createdAt: { gte: lastMessage.createdAt },
      },
      select: { id: true },
    });
    if (operatorReply) continue;
    if (!registerAutoResume(conversation.id)) continue;

    autoResumeInFlight.add(conversation.id);
    try {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { status: "AI_ACTIVE" },
      });
      await prisma.handoffHistory
        .create({
          data: {
            conversationId: conversation.id,
            reason: `Sin respuesta del operador en ${AI_AUTO_RESUME_SECONDS} segundos. TropiBot retomó la atención.`,
            action: "AUTO_RESUME",
          },
        })
        .catch(() => {});

      const digits = customer.phone.replace(/\D/g, "");
      if (!digits) continue;
      const targetJid =
        extractJidFromPayload(lastMessage.rawPayload) ||
        buildJidForPhone(customer.phone);
      if (!targetJid) continue;

      await processBatch(
        activeSock,
        targetJid,
        digits,
        [{ kind: "text", text: lastMessage.content, raw: {} }],
        { skipCustomerPersist: true, autoResumed: true }
      ).catch((error) =>
        console.error("[Worker] Error al retomar chat abandonado:", error)
      );
    } finally {
      autoResumeInFlight.delete(conversation.id);
    }
  }
}

/**
 * Recupera mensajes de clientes que quedaron sin respuesta por un corte del
 * worker (reinicio, caída de red o conflicto de sesión). Solo actúa sobre
 * mensajes con más de 90 s para no duplicar una respuesta en curso.
 */
async function resumeUnansweredCustomers() {
  if (!activeSock) return;

  const business = await prisma.businessProfile.findFirst({
    select: { assistantEnabled: true },
  });
  if (business && !business.assistantEnabled) return;

  const now = Date.now();
  const cutoff = new Date(now - 90_000);
  const floor = new Date(now - 15 * 60_000);

  const candidates = await prisma.conversation.findMany({
    where: {
      status: { not: "HUMAN_TAKEOVER" },
      lastMessageAt: { lt: cutoff, gt: floor },
    },
    orderBy: { lastMessageAt: "asc" },
    take: 10,
    include: { customer: true },
  });

  for (const conversation of candidates) {
    const customer = conversation.customer;
    if (!customer) continue;
    if (autoResumeInFlight.has(conversation.id)) continue;

    const lastMessage = await prisma.message.findFirst({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
    });
    if (!lastMessage || lastMessage.sender !== "CUSTOMER") continue;
    if (!lastMessage.content || lastMessage.content.length > 800) continue;
    // Solo mensajes con más de 90 s: evita duplicar una respuesta en curso.
    if (Date.now() - lastMessage.createdAt.getTime() < 90_000) continue;

    const reply = await prisma.message.findFirst({
      where: {
        conversationId: conversation.id,
        sender: { in: ["ASSISTANT", "OPERATOR"] },
        createdAt: { gte: lastMessage.createdAt },
      },
      select: { id: true },
    });
    if (reply) continue;

    const digits = customer.phone.replace(/\D/g, "");
    if (!digits) continue;
    const targetJid =
      extractJidFromPayload(lastMessage.rawPayload) ||
      buildJidForPhone(customer.phone);
    if (!targetJid) continue;

    autoResumeInFlight.add(conversation.id);
    try {
      await processBatch(
        activeSock,
        targetJid,
        digits,
        [{ kind: "text", text: lastMessage.content, raw: {} }],
        { skipCustomerPersist: true, autoResumed: true }
      );
    } catch (error: any) {
      console.error(
        "[Worker] No se pudo responder un mensaje pendiente:",
        error?.message || error
      );
    } finally {
      autoResumeInFlight.delete(conversation.id);
    }
  }
}

function parseRawPayload(raw: string | null): Record<string, any> {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Cola de salida del CRM.
 *
 * El panel guarda el mensaje del operador en la base de datos aunque no pueda
 * alcanzar al worker (por ejemplo, si el worker corre en una PC sin URL
 * pública). Este barrido lo envía por WhatsApp y actualiza el estado.
 */
async function flushOperatorOutbox() {
  if (!activeSock) return;

  const since = new Date(Date.now() - 10 * 60 * 1000);
  const readyBefore = new Date(Date.now() - 4_000);

  const candidates = await prisma.message.findMany({
    where: {
      sender: { in: ["OPERATOR", "ASSISTANT"] },
      createdAt: { gte: since, lte: readyBefore },
      OR: [
        { rawPayload: { contains: '"deliveryStatus":"FAILED"' } },
        { rawPayload: { contains: '"deliveryStatus":"PENDING_WORKER"' } },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 25,
    include: { conversation: { include: { customer: true } } },
  });

  for (const msg of candidates) {
    const payload = parseRawPayload(msg.rawPayload);
    const status = payload.deliveryStatus;
    if (status !== "FAILED" && status !== "PENDING_WORKER") continue;

    const attempts = Number(payload.attempts || 0);
    if (attempts >= 5) continue;

    const phone = msg.conversation.customer?.phone || "";
    const digits = phone.replace(/\D/g, "");
    if (!digits) continue;

    const lastInbound = await prisma.message.findFirst({
      where: { conversationId: msg.conversationId, sender: "CUSTOMER" },
      orderBy: { createdAt: "desc" },
      select: { rawPayload: true },
    });
    const targetJid =
      extractJidFromPayload(lastInbound?.rawPayload || null) ||
      buildJidForPhone(phone);
    if (!targetJid) continue;

    // Reclamo atómico para que dos instancias no envíen el mismo mensaje.
    const claim = await prisma.message.updateMany({
      where: { id: msg.id, rawPayload: msg.rawPayload },
      data: {
        rawPayload: JSON.stringify({
          ...payload,
          deliveryStatus: "SENDING",
          attempts: attempts + 1,
          claimedAt: new Date().toISOString(),
        }),
      },
    });
    if (claim.count === 0) continue;

    try {
      const sent = await activeSock.sendMessage(targetJid, {
        text: msg.content,
      });
      await prisma.message.update({
        where: { id: msg.id },
        data: {
          rawPayload: JSON.stringify({
            ...payload,
            deliveryStatus: "SENT",
            wamid: sent?.key?.id || null,
            sentAt: new Date().toISOString(),
            source: "worker-outbox",
            attempts: attempts + 1,
          }),
        },
      });
      await prisma.conversation.update({
        where: { id: msg.conversationId },
        data: { lastMessageAt: new Date() },
      });
    } catch (error: any) {
      console.error(
        "[Worker] No se pudo enviar el mensaje del CRM:",
        error?.message || error
      );
      await prisma.message.update({
        where: { id: msg.id },
        data: {
          rawPayload: JSON.stringify({
            ...payload,
            deliveryStatus: "FAILED",
            error: error?.message || String(error),
            attempts: attempts + 1,
            retriedAt: new Date().toISOString(),
          }),
        },
      });
    }
  }
}

async function heartbeatChannel() {
  if (!activeSock) return;
  try {
    await prisma.channel.updateMany({
      where: { type: "whatsapp" },
      data: { status: "connected" },
    });
  } catch {}
}

function startBackgroundJobs() {
  if (backgroundJobsStarted) return;
  backgroundJobsStarted = true;

  // Reanudación automática de chats en atención humana.
  setInterval(() => {
    resumeAbandonedTakeovers().catch(() => {});
  }, 5_000);

  // Mensajes de clientes que quedaron sin respuesta por un corte.
  setInterval(() => {
    resumeUnansweredCustomers().catch(() => {});
  }, 10_000);

  // Cola de salida: mensajes del CRM guardados en la base de datos.
  setInterval(() => {
    flushOperatorOutbox().catch(() => {});
  }, 3_000);

  // Latido para que el CRM sepa que el worker sigue vivo aunque no tenga URL
  // pública (por ejemplo, cuando corre en una PC local).
  setInterval(() => {
    heartbeatChannel().catch(() => {});
  }, 30_000);
  heartbeatChannel().catch(() => {});

  // Vigilante de conexión: si el socket se cayó, reintentar sin esperar.
  setInterval(() => {
    if (!activeSock && !connectInProgress) {
      console.warn("[Worker] Socket de WhatsApp caído. Reintentando conexión...");
      scheduleReconnect(1_000);
    }
  }, 30_000);

  // Recordatorios de citas y resumen diario.
  setInterval(async () => {
    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const startOfTomorrow = new Date(tomorrow.setHours(0, 0, 0, 0));
      const endOfTomorrow = new Date(tomorrow.setHours(23, 59, 59, 999));

      const appointmentsToRemind = await prisma.appointment.findMany({
        where: {
          startTime: { gte: startOfTomorrow, lte: endOfTomorrow },
          reminderSent: false,
          status: "confirmed",
        },
        include: { customer: true },
      });

      for (const appt of appointmentsToRemind) {
        console.log(
          `⏰ [Recordatorio] ${appt.customer.name || appt.customer.phone} - ${appt.serviceName}`
        );
        await prisma.appointment.update({
          where: { id: appt.id },
          data: { reminderSent: true },
        });
        await prisma.activityLog.create({
          data: {
            action: "Recordatorio programado",
            provider: "whatsapp",
            channel: "whatsapp",
            status: "success",
            detailsJson: JSON.stringify({
              cliente: appt.customer.name,
              servicio: appt.serviceName,
              fecha: appt.startTime,
            }),
          },
        });
      }

      if (now.getHours() === 20 && now.getMinutes() === 30) {
        await prisma.activityLog.create({
          data: {
            action: "Resumen diario",
            provider: "system",
            channel: "system",
            status: "success",
            detailsJson: JSON.stringify({
              fecha: now.toLocaleDateString("es-BO"),
              resumen: "Conversaciones y citas registradas en TropiGO.",
            }),
          },
        });
      }
    } catch {
      // Errores transitorios del scheduler no deben tumbar el worker.
    }
  }, 60_000);

  // Comandos enviados desde el panel web.
  setInterval(async () => {
    try {
      const pending = await prisma.workerCommand.findMany({
        where: { status: "PENDING" },
        take: 5,
        orderBy: { createdAt: "asc" },
      });

      for (const cmd of pending) {
        await prisma.workerCommand.update({
          where: { id: cmd.id },
          data: { status: "PROCESSING" },
        });
        console.log(`⚡ Comando de worker [${cmd.command}] procesado.`);
        await prisma.workerCommand.update({
          where: { id: cmd.id },
          data: { status: "COMPLETED" },
        });
      }
    } catch {}
  }, 2_000);

  setInterval(cleanupProcessedIds, 10 * 60 * 1000);
}

function startHealthServer() {
  const port = Number(
    process.env.WORKER_PORT ||
      (process.env.NODE_ENV === "production" ? process.env.PORT : 3001) ||
      3001
  );

  const server = http.createServer((req, res) => {
    // Endpoint para enviar mensajes WhatsApp desde la web/CRM vía Baileys
    if (req.method === "POST" && (req.url === "/send-message" || req.url === "/api/send")) {
      const workerSecret = process.env.WORKER_SECRET;
      if (workerSecret && req.headers["x-worker-secret"] !== workerSecret) {
        res.writeHead(401, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: false, error: "No autorizado." }));
        return;
      }

      let body = "";
      req.on("data", (chunk: any) => {
        body += chunk;
      });
      req.on("end", async () => {
        try {
          const parsed = JSON.parse(body || "{}");
          const { phone, text, buttons } = parsed;
          if (!activeSock) {
            res.writeHead(503, { "Content-Type": "application/json; charset=utf-8" });
            res.end(
              JSON.stringify({
                success: false,
                error: "WhatsApp Baileys no conectado en este momento.",
              })
            );
            return;
          }
          const clean = (phone || "").replace(/\D/g, "");
          const jid = clean.includes("@s.whatsapp.net") ? clean : `${clean}@s.whatsapp.net`;
          let sent: any;
          if (buttons && Array.isArray(buttons) && buttons.length > 0) {
            let formattedText = `${text}\n\n`;
            buttons.forEach((btn: any, index: number) => {
              formattedText += `👉 *${index + 1}.* ${btn.title}\n`;
            });
            formattedText += `\n_(Responde con el número de tu opción)_`;
            sent = await activeSock.sendMessage(jid, { text: formattedText });
          } else {
            sent = await activeSock.sendMessage(jid, { text: text || "" });
          }
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(
            JSON.stringify({
              success: true,
              id: sent?.key?.id || "baileys_sent",
            })
          );
        } catch (e: any) {
          res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
      return;
    }

    if (req.url === "/health" || req.url === "/" || req.url === "/healthz") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(
        JSON.stringify({
          status: "ok",
          service: "tropigo-whatsapp-worker",
          baileysConnected: Boolean(activeSock),
          queuedChats: Object.keys(messageBuffer).length,
          autoResumeSeconds: AI_AUTO_RESUME_SECONDS,
          uptimeSeconds: Math.round(process.uptime()),
          timestamp: new Date().toISOString(),
        })
      );
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  });

  server.on("error", (error: any) => {
    console.error(`[Worker] No se pudo abrir el health server en :${port}:`, error.message);
  });

  server.listen(port, () => {
    console.log(`[Worker] Health server escuchando en :${port}`);
  });

  return server;
}

async function connectBaileys() {
  if (connectInProgress) {
    console.warn("[Worker] Ya hay una conexión de WhatsApp en curso; se omite el reintento.");
    return;
  }
  connectInProgress = true;

  const baileys: any = await import("@whiskeysockets/baileys");
  const makeWASocket = baileys.default || baileys.makeWASocket;
  const { useMultiFileAuthState, DisconnectReason } = baileys;

  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  await restoreBaileysSession();

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: "silent" }) as any,
    browser: ["TropiGO AI", "Chrome", "1.0.0"],
    markOnlineOnConnect: true,
    syncFullHistory: false,
    getMessage: async (key: any) => {
      return { conversation: "TropiGO AI" };
    },
  });

  sock.ev.on("creds.update", async () => {
    await saveCreds();
    scheduleSessionPersist();
  });

  sock.ev.on("connection.update", async (update: any) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("📲 Nuevo código QR de WhatsApp. Escanéalo desde el panel CRM o Escritorio.");
      try {
        const qrDataUrl = await QRCode.toDataURL(qr, { width: 420, margin: 2 });
        await prisma.channel.upsert({
          where: { type: "whatsapp" },
          update: { qrCode: qrDataUrl, status: "scanning_qr" },
          create: { type: "whatsapp", qrCode: qrDataUrl, status: "scanning_qr" },
        });

        try {
          fs.writeFileSync(
            "C:\\Users\\CARRASCO\\Desktop\\ESCANEAR-WHATSAPP-TROPIGO.html",
            `<!DOCTYPE html><html><head><title>Escanear WhatsApp TropiGO</title><meta charset="utf-8"><meta http-equiv="refresh" content="10"></head><body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui,sans-serif;background:#180A2B;color:white;margin:0;padding:20px;box-sizing:border-box;"><div style="background:#240E3E;padding:30px;border-radius:28px;text-align:center;box-shadow:0 20px 40px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.1);max-width:480px;"><h1 style="color:#10B981;margin:0 0 10px 0;font-size:24px;">Vincula TropiBot AI</h1><p style="color:#E2E8F0;font-size:14px;line-height:1.5;margin:0 0 20px 0;">1. Abre WhatsApp en tu celular con el chip <strong>76470538</strong><br>2. Toca los 3 puntitos &gt; <strong>Dispositivos vinculados</strong><br>3. Toca <strong>Vincular un dispositivo</strong> y apunta tu c&aacute;mara aqu&iacute;:</p><img src="${qrDataUrl}" style="border:10px solid white;border-radius:20px;max-width:320px;width:100%;box-shadow:0 10px 25px rgba(0,0,0,0.4);" /><p style="color:#A7F3D0;font-size:12px;margin:20px 0 0 0;font-weight:bold;">⚡ Actualizado en tiempo real</p></div></body></html>`,
            "utf8"
          );
        } catch {}
      } catch (error) {
        console.error("[Worker] No se pudo guardar el QR en la base de datos:", error);
      }
    }

    if (connection === "open") {
      connectInProgress = false;
      activeSock = sock;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      const rawId = sock.user?.id || "";
      const digits = rawId.split(":")[0].split("@")[0].replace(/\D/g, "");
      const phone = digits ? `+${digits}` : null;

      console.log(`✅ WhatsApp conectado${phone ? ` como ${phone}` : ""}.`);
      persistBaileysSession().catch(() => {});
      try {
        await prisma.channel.upsert({
          where: { type: "whatsapp" },
          update: {
            status: "connected",
            qrCode: null,
            phone,
            whatsappLid: sock.user?.lid || null,
          },
          create: {
            type: "whatsapp",
            status: "connected",
            phone,
            whatsappLid: sock.user?.lid || null,
          },
        });
      } catch (error) {
        console.error("[Worker] No se pudo actualizar el canal conectado:", error);
      }
    }

    if (connection === "close") {
      connectInProgress = false;
      activeSock = null;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      const shouldReconnect = !loggedOut;

      console.warn(
        `[Worker] Conexión cerrada (código ${statusCode ?? "desconocido"}). Reconectar: ${shouldReconnect}`
      );

      try {
        await prisma.channel.upsert({
          where: { type: "whatsapp" },
          update: { status: loggedOut ? "logged_out" : "disconnected", qrCode: null },
          create: {
            type: "whatsapp",
            status: loggedOut ? "logged_out" : "disconnected",
          },
        });
      } catch {}

      if (loggedOut) {
        // Las credenciales ya no sirven. Se eliminan para que el próximo
        // arranque genere un QR nuevo y se pueda volver a vincular.
        try {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        } catch {}
        console.error(
          "[Worker] Sesión de WhatsApp cerrada desde el teléfono. Reinicia el worker para generar un nuevo QR."
        );
        return;
      }

      if (shouldReconnect) {
        scheduleReconnect(5_000);
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }: any) => {
    if (type !== "notify" && type !== "append") return;

    for (const message of messages) {
      if (!message?.message || message.key?.fromMe) continue;

      const remoteJid = message.key?.remoteJid || "";
      const altJid = message.key?.remoteJidAlt || "";
      // Si WhatsApp entrega un LID, se prefiere el JID real del teléfono para
      // que la respuesta llegue al chat correcto.
      const jid = altJid.endsWith("@s.whatsapp.net") ? altJid : remoteJid;
      if (!jid || jid.includes("@g.us") || jid === "status@broadcast") continue;

      if (isDuplicate(message.key?.id || "")) continue;

      // Evita reprocesar mensajes históricos después de un reinicio del worker.
      if (message.key?.id) {
        const alreadyStored = await prisma.message.findFirst({
          where: { rawPayload: { contains: message.key.id } },
          select: { id: true },
        });
        if (alreadyStored) continue;
      }

      const parsed = BaileysAdapter.parseBaileysMessage(message);
      if (!parsed) continue;

      const phone = extractSenderPhone(message);
      const profileName = message.pushName || undefined;
      const item: BatchItem = {
        kind: parsed.type,
        text: parsed.text || "",
        raw: parsed.raw || message,
        location: parsed.location,
        profileName: profileName || undefined,
      };

      console.log(
        `📥 [WhatsApp En Vivo] De ${phone} (${profileName || "Sin Nombre"}): ${parsed.type}${parsed.text ? ` - "${parsed.text}"` : ""}`
      );

      const existing = messageBuffer[phone];
      if (existing) {
        clearTimeout(existing.timer);
        existing.items.push(item);
        existing.timer = setTimeout(() => {
          const batch = messageBuffer[phone];
          delete messageBuffer[phone];
          if (batch) {
            processBatch(sock, batch.jid, batch.phone, batch.items).catch((error) =>
              console.error("[Worker] Error en lote:", error)
            );
          }
        }, BATCH_DELAY_MS);
      } else {
        messageBuffer[phone] = {
          jid,
          phone,
          items: [item],
          timer: setTimeout(() => {
            const batch = messageBuffer[phone];
            delete messageBuffer[phone];
            if (batch) {
              processBatch(sock, batch.jid, batch.phone, batch.items).catch((error) =>
                console.error("[Worker] Error en lote:", error)
              );
            }
          }, BATCH_DELAY_MS),
        };
      }

    }
  });

  return sock;
}

async function startWorker() {
  console.log("🚀 [TropiGO Worker] Iniciando asistente de WhatsApp...");
  startHealthServer();
  startBackgroundJobs();

  const provider = (process.env.WHATSAPP_PROVIDER || "BAILEYS_QR").toUpperCase();

  if (provider !== "BAILEYS_QR") {
    console.log(
      `[Worker] WHATSAPP_PROVIDER=${provider}. El worker queda activo en modo salud, pero no conecta Baileys.`
    );
    return;
  }

  await connectBaileys();
}

process.on("SIGINT", async () => {
  console.log("[Worker] Cerrando por SIGINT...");
  await prisma.$disconnect().catch(() => {});
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("[Worker] Cerrando por SIGTERM...");
  await prisma.$disconnect().catch(() => {});
  process.exit(0);
});

// El worker debe sobrevivir a errores aislados para mantenerse 24/7.
process.on("unhandledRejection", (reason) => {
  console.error("[Worker] Promesa rechazada no manejada:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("[Worker] Excepción no capturada:", error);
});

startWorker().catch((error) => {
  connectInProgress = false;
  console.error("[Worker] Error fatal al iniciar. Reintentando en 10s:", error);
  scheduleReconnect(10_000);
});
