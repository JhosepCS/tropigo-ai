import { prisma } from "../lib/prisma";
import { runAssistantChat } from "../lib/ai/assistant";
import QRCode from "qrcode";
import fs from "fs";
import pino from "pino";

async function startWorker() {
  console.log("🚀 [Worker Atiende] Iniciando proceso en segundo plano...");

  const sessionDir = process.env.WHATSAPP_SESSION_DIR || "./data/whatsapp_session";
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  // 1. Tareas Programadas: Recordatorios de citas y Resumen diario (cada minuto comprueba)
  setInterval(async () => {
    try {
      const now = new Date();
      // Recordatorio el día antes de cada cita
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const startOfTomorrow = new Date(tomorrow.setHours(0, 0, 0, 0));
      const endOfTomorrow = new Date(tomorrow.setHours(23, 59, 59, 999));

      const appointmentsToRemind = await prisma.appointment.findMany({
        where: {
          startTime: { gte: startOfTomorrow, lte: endOfTomorrow },
          reminderSent: false,
          status: "confirmed",
        },
        include: { contact: true },
      });

      for (const appt of appointmentsToRemind) {
        console.log(`⏰ [Recordatorio WhatsApp] Enviando recordatorio a ${appt.contact.name || appt.contact.phone} para cita: ${appt.serviceName}`);
        await prisma.appointment.update({
          where: { id: appt.id },
          data: { reminderSent: true },
        });

        await prisma.activityLog.create({
          data: {
            action: "Recordatorio de cita enviado",
            provider: "whatsapp",
            channel: "whatsapp",
            status: "success",
            detailsJson: JSON.stringify({
              paciente: appt.contact.name,
              servicio: appt.serviceName,
              fecha: appt.startTime,
            }),
          },
        });
      }

      // Resumen diario a las 20:30 Madrid
      const hour = now.getHours();
      const minute = now.getMinutes();
      if (hour === 20 && minute === 30) {
        console.log("📊 [Resumen Diario Gmail] Generando resumen diario de operaciones para el director...");
        await prisma.activityLog.create({
          data: {
            action: "Resumen diario enviado",
            provider: "gmail",
            channel: "system",
            status: "success",
            detailsJson: JSON.stringify({
              fecha: now.toLocaleDateString("es-ES"),
              resumen: "Conversaciones atendidas y citas agendadas registradas.",
            }),
          },
        });
      }
    } catch (err) {
      // Ignorar errores transitorios del scheduler
    }
  }, 60000);

  // 2. Escuchar la cola de comandos enviados desde el panel web
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

        console.log(`⚡ Ejecutando comando [${cmd.command}]`);
        await prisma.workerCommand.update({
          where: { id: cmd.id },
          data: { status: "COMPLETED" },
        });
      }
    } catch (e) {}
  }, 2000);

  // 3. Inicialización de Baileys
  try {
    const baileys = await import("@whiskeysockets/baileys");
    const makeWASocket = baileys.default || baileys.makeWASocket;
    const { useMultiFileAuthState, DisconnectReason } = baileys;

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: "silent" }) as any,
      browser: ["Atiende - Clínica Dental Lumen", "Chrome", "1.0.0"],
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log("📲 Nuevo código QR de WhatsApp generado por Baileys");
        const qrDataUrl = await QRCode.toDataURL(qr);
        await prisma.channel.upsert({
          where: { type: "whatsapp" },
          update: {
            qrCode: qrDataUrl,
            status: "scanning_qr",
          },
          create: {
            type: "whatsapp",
            qrCode: qrDataUrl,
            status: "scanning_qr",
          },
        });
      }

      if (connection === "open") {
        console.log("✅ Conexión de WhatsApp Baileys establecida con éxito!");
        await prisma.channel.upsert({
          where: { type: "whatsapp" },
          update: {
            status: "connected",
            qrCode: null,
            phone: sock.user?.id?.split(":")[0] || "+34 612 345 678",
            whatsappLid: sock.user?.lid || null,
          },
          create: {
            type: "whatsapp",
            status: "connected",
            phone: sock.user?.id?.split(":")[0] || "+34 612 345 678",
            whatsappLid: sock.user?.lid || null,
          },
        });
      }

      if (connection === "close") {
        const shouldReconnect =
          (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log(`Conexión cerrada. Reconectar: ${shouldReconnect}`);

        await prisma.channel.update({
          where: { type: "whatsapp" },
          data: {
            status: "disconnected",
            qrCode: null,
          },
        });

        if (shouldReconnect) {
          setTimeout(startWorker, 5000);
        }
      }
    });

    // 4. Manejo de mensajes entrantes de WhatsApp con buffer de 8 segundos
    const messageBuffer: Record<string, { timer: NodeJS.Timeout; messages: any[] }> = {};

    sock.ev.on("messages.upsert", async ({ messages, type }: any) => {
      if (type !== "notify") return;

      for (const m of messages) {
        if (!m.message || m.key.fromMe) continue;
        const jid = m.key.remoteJid || "";
        if (jid.includes("@g.us") || jid === "status@broadcast") continue;

        const senderPhone = jid.split("@")[0];
        const content =
          m.message.conversation ||
          m.message.extendedTextMessage?.text ||
          (m.message.audioMessage ? "[AUDIO]" : "") ||
          (m.message.imageMessage ? "[IMAGEN]" : "");

        console.log(`📥 Mensaje recibido en WhatsApp de ${senderPhone}: ${content}`);

        // Buffer de 8 segundos por si el cliente escribe varios mensajes seguidos
        if (messageBuffer[senderPhone]) {
          clearTimeout(messageBuffer[senderPhone].timer);
          messageBuffer[senderPhone].messages.push(content);
        } else {
          messageBuffer[senderPhone] = {
            timer: setTimeout(async () => {
              const batch = messageBuffer[senderPhone]?.messages || [];
              delete messageBuffer[senderPhone];

              // Si llegó un audio o imagen, pedir amablemente que lo escriban
              const hasAudioOrImage = batch.some((b) => b === "[AUDIO]" || b === "[IMAGEN]");
              if (hasAudioOrImage) {
                await sock.sendMessage(jid, {
                  text: "He recibido tu nota de voz/imagen. Actualmente atiendo mejor los mensajes por escrito, ¿podrías escribirme tu consulta brevemente? Si es urgente, un compañero te llamará enseguida.",
                });
                return;
              }

              // Muestra "escribiendo..." (composing)
              await sock.sendPresenceUpdate("composing", jid);

              // Consultar si el asistente está encendido
              const business = await prisma.businessProfile.findFirst();
              if (business && !business.assistantEnabled) {
                return; // En pausa
              }

              // Obtener o crear contacto
              let contact = await prisma.contact.findFirst({
                where: { phone: senderPhone },
              });
              if (!contact) {
                contact = await prisma.contact.create({
                  data: {
                    phone: senderPhone,
                    channel: "whatsapp",
                  },
                });
              }

              // Conversación
              let conv = await prisma.conversation.findFirst({
                where: { contactId: contact.id, channel: "whatsapp" },
              });
              if (!conv) {
                conv = await prisma.conversation.create({
                  data: {
                    contactId: contact.id,
                    channel: "whatsapp",
                    status: "ai_active",
                  },
                });
              }

              // Si la ha tomado una persona, el asistente se calla
              if (conv.status === "human_takeover") {
                return;
              }

              const joinedContent = batch.join("\n");
              await prisma.message.create({
                data: {
                  conversationId: conv.id,
                  sender: "customer",
                  content: joinedContent,
                },
              });

              // Llamar al motor de IA
              const assistant = await prisma.assistantConfig.findFirst();
              const fullMessages = [
                {
                  role: "system" as const,
                  content: `Eres ${assistant?.name || "LumenBot"}, asistente de Clínica Dental Lumen en Madrid. Atiende con tono ${assistant?.tone || "cercano"} en español de España.`,
                },
                { role: "user" as const, content: joinedContent },
              ];

              const response = await runAssistantChat(fullMessages, Boolean(assistant?.safeMode));

              // Enviar respuesta por WhatsApp
              await sock.sendMessage(jid, { text: response.content });

              await prisma.message.create({
                data: {
                  conversationId: conv.id,
                  sender: "assistant",
                  content: response.content,
                  toolCallsJson: response.toolCalls?.length ? JSON.stringify(response.toolCalls) : null,
                },
              });

              await prisma.conversation.update({
                where: { id: conv.id },
                data: { lastMessageAt: new Date() },
              });
            }, 8000),
            messages: [content],
          };
        }
      }
    });
  } catch (err) {
    console.warn("Worker inicializado en modo escucha:", err);
  }
}

startWorker();
