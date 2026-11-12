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
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import http from "http";
import pino from "pino";

const sessionDir = process.env.WHATSAPP_SESSION_DIR || "./data/whatsapp_session";
const BATCH_DELAY_MS = Number(process.env.WHATSAPP_BATCH_DELAY_MS || 6000);
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

let backgroundJobsStarted = false;
let reconnectTimer: NodeJS.Timeout | null = null;

function scheduleReconnect(delayMs = 5000) {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectBaileys().catch((error) => {
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

async function processBatch(
  sock: any,
  jid: string,
  phone: string,
  items: BatchItem[]
) {
  try {
    const business = await prisma.businessProfile.findFirst();
    if (business && !business.assistantEnabled) return;

    const profileName = items.find((item) => item.profileName)?.profileName;
    const customer = await getOrCreateCustomer(phone, profileName);
    const conversation = await ensureConversationSession(customer.id, "WHATSAPP");

    if (conversation.status === "HUMAN_TAKEOVER") {
      console.log(
        `[Worker] Conversación ${conversation.id} en atención humana. El asistente no responde.`
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
          messageIds: items.map((item) => item.raw?.key?.id).filter(Boolean),
        }),
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

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
      take: 12,
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
      maxToolRounds: 3,
    });

    const reply =
      aiResponse.content?.trim() ||
      "¡Hola! Soy TropiBot de TropiGO. ¿En qué puedo ayudarte hoy?";

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
          "Disculpa, tuve un problema técnico al procesar tu mensaje. " +
          "Intenta nuevamente en unos segundos o escribe a la operadora al +591 74389012.",
      });
    } catch {}
  }
}

function startBackgroundJobs() {
  if (backgroundJobsStarted) return;
  backgroundJobsStarted = true;

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
    if (req.url === "/health" || req.url === "/" || req.url === "/healthz") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(
        JSON.stringify({
          status: "ok",
          service: "tropigo-whatsapp-worker",
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
  });

  sock.ev.on("creds.update", async () => {
    await saveCreds();
    scheduleSessionPersist();
  });

  sock.ev.on("connection.update", async (update: any) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("📲 Nuevo código QR de WhatsApp. Escanéalo desde el panel CRM.");
      try {
        const qrDataUrl = await QRCode.toDataURL(qr, { width: 420, margin: 2 });
        await prisma.channel.upsert({
          where: { type: "whatsapp" },
          update: { qrCode: qrDataUrl, status: "scanning_qr" },
          create: { type: "whatsapp", qrCode: qrDataUrl, status: "scanning_qr" },
        });
      } catch (error) {
        console.error("[Worker] No se pudo guardar el QR en la base de datos:", error);
      }
    }

    if (connection === "open") {
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
    if (type !== "notify") return;

    for (const message of messages) {
      if (!message?.message || message.key?.fromMe) continue;

      const jid = message.key?.remoteJid || "";
      if (!jid || jid.includes("@g.us") || jid === "status@broadcast") continue;

      if (isDuplicate(message.key?.id || "")) continue;

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
        `📥 WhatsApp de ${phone}: ${parsed.type}${parsed.text ? ` - ${parsed.text}` : ""}`
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

startWorker().catch((error) => {
  console.error("[Worker] Error fatal al iniciar:", error);
  process.exit(1);
});
