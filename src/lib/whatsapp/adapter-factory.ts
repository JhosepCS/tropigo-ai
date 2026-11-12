import { IWhatsAppProvider } from "./types";
import { getActiveMetaAdapter } from "./meta-manager";

export class WhatsAppAdapterFactory {
  /**
   * Obtiene el proveedor oficial de WhatsApp (Meta Cloud API)
   * Si no está configurado, retorna un fallback que informa que se debe conectar desde Ajustes.
   */
  static async getAdapter(): Promise<IWhatsAppProvider> {
    const metaAdapter = await getActiveMetaAdapter();

    if (metaAdapter) {
      return metaAdapter;
    }

    const fallbackSend = async (to: string, _text: string): Promise<string> => {
      console.warn(
        `[WhatsAppAdapterFactory] No se pudo enviar mensaje a ${to}. WhatsApp Business Cloud API no está conectado en Ajustes.`
      );
      throw new Error(
        "WhatsApp Cloud API no está configurado. Ve a Ajustes > Conectar WhatsApp para activar tu número oficial de Meta."
      );
    };

    return {
      sendMessage: fallbackSend,
      async sendInteractiveButtons(to, text, _buttons) {
        return fallbackSend(to, text);
      },
      async sendInteractiveList(to, header, body, _sections) {
        return fallbackSend(to, `${header}\n\n${body}`);
      },
      async sendLocationRequest(to, text) {
        return fallbackSend(to, text);
      },
      async markAsRead() {},
      async sendPresenceTyping() {},
      async sendImage(to, _imageUrl, _caption) {
        return fallbackSend(to, "[imagen]");
      },
    };
  }
}
