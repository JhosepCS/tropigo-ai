import {
  IWhatsAppProvider,
  InteractiveButton,
  ListSection,
  IncomingWhatsAppMessage,
} from "./types";

export class BaileysAdapter implements IWhatsAppProvider {
  private sock: any;

  constructor(socketInstance: any) {
    this.sock = socketInstance;
  }

  private formatJid(to: string): string {
    const clean = to.replace(/\D/g, "");
    return clean.includes("@s.whatsapp.net") ? clean : `${clean}@s.whatsapp.net`;
  }

  async sendMessage(to: string, text: string): Promise<string> {
    if (!this.sock) throw new Error("Socket de Baileys no conectado");
    const jid = this.formatJid(to);
    const sent = await this.sock.sendMessage(jid, { text });
    return sent?.key?.id || "baileys_sent";
  }

  async sendInteractiveButtons(
    to: string,
    text: string,
    buttons: InteractiveButton[]
  ): Promise<string> {
    if (!this.sock) throw new Error("Socket de Baileys no conectado");
    const jid = this.formatJid(to);

    // Formato de botones interactivos compatible universalmente con WhatsApp
    let formattedText = `${text}\n\n`;
    buttons.forEach((btn, index) => {
      formattedText += `👉 *${index + 1}.* ${btn.title}\n`;
    });
    formattedText += `\n_(Responde con el número de tu opción)_`;

    const sent = await this.sock.sendMessage(jid, { text: formattedText });
    return sent?.key?.id || "baileys_sent";
  }

  async sendInteractiveList(
    to: string,
    header: string,
    body: string,
    sections: ListSection[]
  ): Promise<string> {
    if (!this.sock) throw new Error("Socket de Baileys no conectado");
    const jid = this.formatJid(to);

    let menu = `📋 *${header}*\n\n${body}\n\n`;
    sections.forEach((sec) => {
      menu += `*--- ${sec.title.toUpperCase()} ---*\n`;
      sec.rows.forEach((row) => {
        menu += `• *${row.title}*${row.description ? ` - ${row.description}` : ""}\n`;
      });
      menu += `\n`;
    });

    const sent = await this.sock.sendMessage(jid, { text: menu.trim() });
    return sent?.key?.id || "baileys_sent";
  }

  async sendLocationRequest(to: string, text: string): Promise<string> {
    if (!this.sock) throw new Error("Socket de Baileys no conectado");
    const jid = this.formatJid(to);
    const prompt =
      text ||
      "📍 *Atiende:* Por favor comparte tu ubicación para indicarte la ruta más rápida a la clínica.";
    const message = `${prompt}\n\n👉 *Pulsa el clip 📎 o botón (+) > Ubicación > Enviar mi ubicación actual*`;

    const sent = await this.sock.sendMessage(jid, { text: message });
    return sent?.key?.id || "baileys_sent";
  }

  async markAsRead(messageId: string): Promise<void> {
    if (!this.sock) return;
    try {
      // Si el id es compuesto o key
      await this.sock.readMessages([{ id: messageId }]);
    } catch (e) {
      // Ignorar fallos no críticos de lectura
    }
  }

  async sendPresenceTyping(to: string): Promise<void> {
    if (!this.sock) return;
    try {
      const jid = this.formatJid(to);
      await this.sock.sendPresenceUpdate("composing", jid);
    } catch (e) {
      // Ignorar fallos de presencia
    }
  }

  /**
   * Normaliza un mensaje entrante de Baileys a la estructura unificada IncomingWhatsAppMessage
   */
  static parseBaileysMessage(m: any): IncomingWhatsAppMessage | null {
    if (!m?.message) return null;
    if (m.key?.fromMe) return null; // Ignorar mensajes propios

    const from = (m.key?.remoteJid || "")
      .replace("@s.whatsapp.net", "")
      .replace("@lid", "");
    if (!from || from.includes("@g.us") || from === "status@broadcast") {
      return null; // Ignorar grupos y estados
    }

    const id = m.key?.id || "";
    const timestamp = (m.messageTimestamp as number) * 1000 || Date.now();

    // Desenvolver mensajes efímeros, de una sola visualización y editados.
    let msg = m.message;
    if (msg.ephemeralMessage?.message) msg = msg.ephemeralMessage.message;
    if (msg.viewOnceMessage?.message) msg = msg.viewOnceMessage.message;
    if (msg.viewOnceMessageV2?.message) msg = msg.viewOnceMessageV2.message;
    if (msg.documentWithCaptionMessage?.message) {
      msg = msg.documentWithCaptionMessage.message;
    }

    // El raw normalizado es el que debe usar MediaDownloader.
    const raw = { ...m, message: msg };

    // 1. Ubicación GPS
    const location = msg.locationMessage || msg.liveLocationMessage;
    if (location) {
      return {
        id,
        from,
        timestamp,
        type: "location",
        location: {
          latitude: location.degreesLatitude,
          longitude: location.degreesLongitude,
          name: location.name,
          address: location.address,
        },
        raw,
      };
    }

    // 2. Nota de voz o audio
    if (msg.audioMessage) {
      return {
        id,
        from,
        timestamp,
        type: "audio",
        raw,
      };
    }

    // 3. Imagen (con o sin caption)
    if (msg.imageMessage) {
      return {
        id,
        from,
        timestamp,
        type: "image",
        text: msg.imageMessage.caption || "",
        mediaCaption: msg.imageMessage.caption || undefined,
        raw,
      };
    }

    // 4. Documento
    if (msg.documentMessage) {
      return {
        id,
        from,
        timestamp,
        type: "document",
        text: msg.documentMessage.fileName || "",
        mediaCaption:
          msg.documentMessage.caption || msg.documentMessage.fileName || undefined,
        raw,
      };
    }

    // 5. Texto simple o extendido
    const text =
      msg.conversation ||
      msg.extendedTextMessage?.text ||
      msg.videoMessage?.caption ||
      "";

    if (text) {
      return {
        id,
        from,
        timestamp,
        type: "text",
        text,
        raw,
      };
    }

    return {
      id,
      from,
      timestamp,
      type: "other",
      raw,
    };
  }
}
