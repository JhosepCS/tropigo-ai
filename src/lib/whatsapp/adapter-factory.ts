import { IWhatsAppProvider } from "./types";
import { getActiveMetaAdapter } from "./meta-manager";

export class WhatsAppAdapterFactory {
  /**
   * Obtiene el proveedor oficial de WhatsApp.
   * Prioridad 1: Meta Cloud API oficial.
   * Prioridad 2: Worker activo de WhatsApp (Baileys / Celular vinculado).
   * Prioridad 3: Fallback descriptivo con advertencia clara.
   */
  static async getAdapter(): Promise<IWhatsAppProvider> {
    const metaAdapter = await getActiveMetaAdapter();

    if (metaAdapter) {
      return metaAdapter;
    }

    const workerPort = process.env.WORKER_PORT || 3001;
    const workerUrl = `http://127.0.0.1:${workerPort}/send-message`;

    const sendViaWorker = async (to: string, text: string, buttons?: any[]): Promise<string> => {
      try {
        const res = await fetch(workerUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: to, text, buttons }),
          signal: AbortSignal.timeout(6000),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            return data.id || "baileys_sent";
          }
        }
      } catch {}

      console.warn(
        `[WhatsAppAdapterFactory] No se pudo enviar mensaje a ${to}. Ni Meta Cloud API ni el worker Baileys respondieron.`
      );
      throw new Error(
        "WhatsApp no está activo en este momento. Verifica que el servicio de WhatsApp esté encendido."
      );
    };

    const provider: IWhatsAppProvider = {
      async sendMessage(to: string, text: string): Promise<string> {
        return sendViaWorker(to, text);
      },

      async sendInteractiveButtons(to, text, buttons) {
        return sendViaWorker(to, text, buttons);
      },

      async sendInteractiveList(to, header, body, sections) {
        let menu = `📋 *${header}*\n\n${body}\n\n`;
        sections.forEach((sec) => {
          menu += `*--- ${sec.title.toUpperCase()} ---*\n`;
          sec.rows.forEach((row) => {
            menu += `• *${row.title}*${row.description ? ` - ${row.description}` : ""}\n`;
          });
          menu += `\n`;
        });
        return sendViaWorker(to, menu.trim());
      },

      async sendLocationRequest(to, text) {
        const msg = `${text}\n\n👉 *Pulsa el clip 📎 o botón (+) > Ubicación > Enviar mi ubicación actual*`;
        return sendViaWorker(to, msg);
      },

      async markAsRead() {},
      async sendPresenceTyping() {},
      async sendImage(to, imageUrl, caption) {
        return sendViaWorker(to, caption ? `${caption}\n${imageUrl}` : imageUrl);
      },
    };

    return provider;
  }
}
