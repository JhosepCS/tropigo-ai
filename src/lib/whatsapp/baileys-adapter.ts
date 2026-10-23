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

    const from = (m.key?.remoteJid || "").replace("@s.whatsapp.net", "").replace("@lid", "");
    if (!from || from.includes("@g.us") || from === "status@broadcast") {
      return null; // Ignorar grupos y estados
    }

    const id = m.key?.id || "";
    const timestamp = (m.messageTimestamp as number) * 1000 || Date.now();
    const msg = m.message;

    // 1. Mensaje de Texto simple o extendido
    const text =
      msg.conversation ||
      msg.extendedTextMessage?.text ||
      msg.imageMessage?.caption ||
      msg.videoMessage?.caption;

    // 2. Ubicación GPS
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
        raw: m,
      };
    }

    // 3. Nota de voz o audio
    const audio = msg.audioMessage;
    if (audio) {
      return {
        id,
        from,
        timestamp,
        type: "audio",
        raw: m,
      };
    }

    // 4. Texto estándar
    if (text) {
      return {
        id,
        from,
        timestamp,
        type: "text",
        text,
        raw: m,
      };
    }

    return {
      id,
      from,
      timestamp,
      type: "other",
      raw: m,
    };
  }
}
