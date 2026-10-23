import { prisma } from "../lib/prisma";
import { registerBaileysSocket } from "../lib/whatsapp/adapter-factory";
import { BaileysAdapter } from "../lib/whatsapp/baileys-adapter";
import QRCode from "qrcode";
import path from "path";
import fs from "fs";
import pino from "pino";

// Importación dinámica segura de Baileys
async function startWorker() {
  console.log("🛵 [Worker Tropigo] Iniciando proceso en segundo plano...");

  const sessionDir = process.env.WHATSAPP_SESSION_DIR || "./data/whatsapp_session";
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  // 1. Escuchar la cola de comandos enviados desde el panel web
  setInterval(async () => {
    try {
      const pendingCommands = await prisma.workerCommand.findMany({
        where: { status: "PENDING" },
        take: 5,
        orderBy: { createdAt: "asc" },
      });

      for (const cmd of pendingCommands) {
        await prisma.workerCommand.update({
          where: { id: cmd.id },
          data: { status: "PROCESSING" },
        });

        try {
          const payload = cmd.payloadJson ? JSON.parse(cmd.payloadJson) : {};
          console.log(`⚡ Ejecutando comando [${cmd.command}] para ${payload.to || "sistema"}`);

          // Enviar por WhatsApp si el socket está disponible
          // Se complementará con la IA y el envío de mensajes
          await prisma.workerCommand.update({
            where: { id: cmd.id },
            data: { status: "COMPLETED" },
          });
        } catch (err: any) {
          console.error(`Error procesando comando ${cmd.id}:`, err);
          await prisma.workerCommand.update({
            where: { id: cmd.id },
            data: { status: "FAILED" },
          });
        }
      }
    } catch (e) {
      // Ignorar errores transitorios de polling
    }
  }, 2000);

  // 2. Inicialización de Baileys
  try {
    const baileys = await import("@whiskeysockets/baileys");
    const makeWASocket = baileys.default || baileys.makeWASocket;
    const { useMultiFileAuthState, DisconnectReason } = baileys;

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: "silent" }) as any,
      browser: ["Tropigo Delivery", "Chrome", "1.0.0"],
    });

    registerBaileysSocket(sock);

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log("📲 Nuevo código QR de WhatsApp generado");
        const qrDataUrl = await QRCode.toDataURL(qr);
        const config = await prisma.whatsAppConfig.findFirst();
        if (config) {
          await prisma.whatsAppConfig.update({
            where: { id: config.id },
            data: {
              baileysQr: qrDataUrl,
              baileysStatus: "SCAN_QR",
            },
          });
        }
      }

      if (connection === "open") {
        console.log("✅ Conexión de WhatsApp Baileys establecida con éxito!");
        const config = await prisma.whatsAppConfig.findFirst();
        if (config) {
          await prisma.whatsAppConfig.update({
            where: { id: config.id },
            data: {
              baileysStatus: "CONNECTED",
              baileysQr: null,
              connectedPhone: sock.user?.id?.split(":")[0] || null,
            },
          });
        }
      }

      if (connection === "close") {
        const shouldReconnect =
          (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log(`Conexión cerrada. Reconectar: ${shouldReconnect}`);

        const config = await prisma.whatsAppConfig.findFirst();
        if (config) {
          await prisma.whatsAppConfig.update({
            where: { id: config.id },
            data: {
              baileysStatus: "DISCONNECTED",
              baileysQr: null,
            },
          });
        }

        if (shouldReconnect) {
          setTimeout(startWorker, 5000);
        }
      }
    });

    // 3. Manejo de mensajes entrantes de WhatsApp (Baileys)
    const messageBuffer: Record<string, { timer: NodeJS.Timeout; messages: any[] }> = {};

    sock.ev.on("messages.upsert", async ({ messages, type }: any) => {
      if (type !== "notify") return;

      for (const m of messages) {
        const parsed = BaileysAdapter.parseBaileysMessage(m);
        if (!parsed) continue;

        console.log(`📥 Mensaje recibido en Baileys de ${parsed.from}: ${parsed.text || parsed.type}`);

        // Buffer inteligente de 8 segundos para agrupar mensajes continuos
        if (messageBuffer[parsed.from]) {
          clearTimeout(messageBuffer[parsed.from].timer);
          messageBuffer[parsed.from].messages.push(parsed);
        } else {
          messageBuffer[parsed.from] = {
            timer: setTimeout(async () => {
              const batch = messageBuffer[parsed.from]?.messages || [];
              delete messageBuffer[parsed.from];

              // Notificar presencia: "escribiendo..."
              await sock.sendPresenceUpdate("composing", `${parsed.from}@s.whatsapp.net`);

              console.log(`🤖 Procesando lote de ${batch.length} mensaje(s) de ${parsed.from}`);
              // Aquí el motor de IA responderá los mensajes agrupados
            }, 8000),
            messages: [parsed],
          };
        }
      }
    });
  } catch (err) {
    console.warn("Worker inicializado en modo escucha básica:", err);
  }
}

startWorker();
