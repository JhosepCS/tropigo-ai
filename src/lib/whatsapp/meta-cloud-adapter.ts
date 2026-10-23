import crypto from "crypto";
import {
  IWhatsAppProvider,
  InteractiveButton,
  ListSection,
  IncomingWhatsAppMessage,
} from "./types";

export interface MetaConfig {
  phoneNumberId: string;
  systemToken: string;
  appSecret?: string;
  apiVersion?: string;
}

export class MetaCloudApiAdapter implements IWhatsAppProvider {
  private phoneNumberId: string;
  private systemToken: string;
  private appSecret?: string;
  private baseUrl: string;

  constructor(config: MetaConfig) {
    this.phoneNumberId = config.phoneNumberId;
    this.systemToken = config.systemToken;
    this.appSecret = config.appSecret;
    const version = config.apiVersion || "v21.0";
    this.baseUrl = `https://graph.facebook.com/${version}/${this.phoneNumberId}`;
  }

  private cleanPhone(phone: string): string {
    return phone.replace(/\D/g, "");
  }

  private async request(endpoint: string, body: any): Promise<any> {
    const url = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}/${endpoint}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.systemToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(
        `Meta Cloud API Error [${res.status}]: ${JSON.stringify(errData)}`
      );
    }

    return res.json();
  }

  async sendMessage(to: string, text: string): Promise<string> {
    const recipient = this.cleanPhone(to);
    const response = await this.request("messages", {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "text",
      text: {
        preview_url: false,
        body: text,
      },
    });

    return response.messages?.[0]?.id || "meta_sent";
  }

  async sendInteractiveButtons(
    to: string,
    text: string,
    buttons: InteractiveButton[]
  ): Promise<string> {
    const recipient = this.cleanPhone(to);
    // WhatsApp Cloud API permite un máximo de 3 botones interactivos de tipo reply
    const formattedButtons = buttons.slice(0, 3).map((btn) => ({
      type: "reply",
      reply: {
        id: btn.id,
        title: btn.title.slice(0, 20), // Máximo 20 caracteres por título en Meta
      },
    }));

    const response = await this.request("messages", {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text },
        action: { buttons: formattedButtons },
      },
    });

    return response.messages?.[0]?.id || "meta_sent";
  }

  async sendInteractiveList(
    to: string,
    header: string,
    body: string,
    sections: ListSection[]
  ): Promise<string> {
    const recipient = this.cleanPhone(to);

    const formattedSections = sections.map((sec) => ({
      title: sec.title.slice(0, 24),
      rows: sec.rows.slice(0, 10).map((row) => ({
        id: row.id,
        title: row.title.slice(0, 24),
        description: row.description ? row.description.slice(0, 72) : undefined,
      })),
    }));

    const response = await this.request("messages", {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "interactive",
      interactive: {
        type: "list",
        header: {
          type: "text",
          text: header.slice(0, 60),
        },
        body: { text: body.slice(0, 1024) },
        action: {
          button: "Ver Opciones",
          sections: formattedSections,
        },
      },
    });

    return response.messages?.[0]?.id || "meta_sent";
  }

  async sendLocationRequest(to: string, text: string): Promise<string> {
    const recipient = this.cleanPhone(to);
    // WhatsApp Cloud API Location Request Message
    const response = await this.request("messages", {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "interactive",
      interactive: {
        type: "location_request_message",
        body: {
          text:
            text ||
            "📍 Por favor comparte tu ubicación exacta para calcular tu tarifa y enviar tu pedido.",
        },
        action: {
          name: "send_location",
        },
      },
    }).catch(async () => {
      // Fallback a texto explicativo si el número no soporta location_request_message
      return this.sendMessage(
        recipient,
        `${text}\n\n👉 *Pulsa el icono de adjuntar (clip) > Ubicación > Enviar mi ubicación actual*`
      );
    });

    return typeof response === "string" ? response : response.messages?.[0]?.id || "meta_sent";
  }

  async markAsRead(messageId: string): Promise<void> {
    try {
      await this.request("messages", {
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      });
    } catch (e) {
      console.warn("No se pudo marcar mensaje como leído en Meta:", e);
    }
  }

  async sendPresenceTyping(to: string): Promise<void> {
    // La Cloud API oficial no tiene endpoint directo para 'composing' libre fuera de templates,
    // pero responder rápido es la mejor práctica. Método no-op seguro para la API oficial.
    return Promise.resolve();
  }

  /**
   * Valida la firma criptográfica HMAC-SHA256 del Webhook de Meta
   */
  static validateSignature(
    rawBody: string,
    signatureHeader: string | null,
    appSecret: string
  ): boolean {
    if (!signatureHeader || !appSecret) return false;
    const [algorithm, signature] = signatureHeader.split("=");
    if (algorithm !== "sha256" || !signature) return false;

    const hmac = crypto.createHmac("sha256", appSecret);
    const expected = hmac.update(rawBody).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }

  /**
   * Extrae y normaliza los mensajes entrantes del payload de Meta
   */
  static parseWebhookMessages(body: any): IncomingWhatsAppMessage[] {
    const results: IncomingWhatsAppMessage[] = [];
    if (!body?.entry) return results;

    for (const entry of body.entry) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value?.messages) continue;

        for (const msg of value.messages) {
          const base: IncomingWhatsAppMessage = {
            id: msg.id,
            from: msg.from,
            timestamp: parseInt(msg.timestamp, 10) * 1000,
            type: "other",
            raw: msg,
          };

          if (msg.type === "text") {
            base.type = "text";
            base.text = msg.text?.body;
          } else if (msg.type === "audio" || msg.type === "voice") {
            base.type = "audio";
            base.audioMediaId = msg.audio?.id || msg.voice?.id;
          } else if (msg.type === "location") {
            base.type = "location";
            base.location = {
              latitude: msg.location.latitude,
              longitude: msg.location.longitude,
              name: msg.location.name,
              address: msg.location.address,
            };
          } else if (msg.type === "interactive") {
            base.type = "interactive";
            if (msg.interactive?.type === "button_reply") {
              base.interactiveResponseId = msg.interactive.button_reply.id;
              base.text = msg.interactive.button_reply.title;
            } else if (msg.interactive?.type === "list_reply") {
              base.interactiveResponseId = msg.interactive.list_reply.id;
              base.text = msg.interactive.list_reply.title;
            }
          }

          results.push(base);
        }
      }
    }

    return results;
  }

  /**
   * Descarga el buffer de audio desde Meta Graph API
   */
  async downloadMedia(mediaId: string): Promise<Buffer> {
    const mediaRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${this.systemToken}` },
    });
    if (!mediaRes.ok) throw new Error("No se pudo obtener URL del medio");
    const mediaInfo = await mediaRes.json();
    const binaryRes = await fetch(mediaInfo.url, {
      headers: { Authorization: `Bearer ${this.systemToken}` },
    });
    const arrayBuf = await binaryRes.arrayBuffer();
    return Buffer.from(arrayBuf);
  }
}
