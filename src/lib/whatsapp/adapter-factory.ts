import { prisma } from "../prisma";
import { decrypt } from "../encryption";
import { IWhatsAppProvider } from "./types";
import { MetaCloudApiAdapter } from "./meta-cloud-adapter";
import { BaileysAdapter } from "./baileys-adapter";

// Instancia global en memoria del socket de Baileys cuando el worker está corriendo
let globalBaileysSocket: any = null;

export function registerBaileysSocket(sock: any) {
  globalBaileysSocket = sock;
}

export function getBaileysSocket(): any {
  return globalBaileysSocket;
}

export class WhatsAppAdapterFactory {
  /**
   * Obtiene el proveedor de WhatsApp actualmente activo (Meta Cloud API o Baileys)
   */
  static async getAdapter(): Promise<IWhatsAppProvider> {
    const config = await prisma.whatsAppConfig.findFirst();
    const provider = config?.activeProvider || process.env.WHATSAPP_ACTIVE_PROVIDER || "BAILEYS_QR";

    if (provider === "META_CLOUD_API") {
      const phoneNumberId = config?.metaPhoneNumberId || process.env.META_PHONE_NUMBER_ID || "";
      const systemToken = config?.metaSystemTokenEncrypted
        ? decrypt(config.metaSystemTokenEncrypted)
        : process.env.META_SYSTEM_TOKEN || "";
      const appSecret = config?.metaAppSecretEncrypted
        ? decrypt(config.metaAppSecretEncrypted)
        : process.env.META_APP_SECRET;

      if (!phoneNumberId || !systemToken) {
        throw new Error(
          "Meta Cloud API está seleccionado pero faltan PHONE_NUMBER_ID o SYSTEM_TOKEN en la configuración."
        );
      }

      return new MetaCloudApiAdapter({
        phoneNumberId,
        systemToken,
        appSecret,
      });
    }

    // Por defecto: Baileys
    if (!globalBaileysSocket) {
      // Si estamos en el proceso web y no hay socket directo, proveemos un adaptador
      // que emite comandos a través de WorkerCommand para que el worker de Baileys lo ejecute
      return {
        async sendMessage(to: string, text: string): Promise<string> {
          const cmd = await prisma.workerCommand.create({
            data: {
              command: "SEND_WHATSAPP_MESSAGE",
              payloadJson: JSON.stringify({ to, text }),
            },
          });
          return cmd.id;
        },
        async sendInteractiveButtons(to: string, text: string, buttons: any[]): Promise<string> {
          const cmd = await prisma.workerCommand.create({
            data: {
              command: "SEND_WHATSAPP_BUTTONS",
              payloadJson: JSON.stringify({ to, text, buttons }),
            },
          });
          return cmd.id;
        },
        async sendInteractiveList(to: string, header: string, body: string, sections: any[]): Promise<string> {
          const cmd = await prisma.workerCommand.create({
            data: {
              command: "SEND_WHATSAPP_LIST",
              payloadJson: JSON.stringify({ to, header, body, sections }),
            },
          });
          return cmd.id;
        },
        async sendLocationRequest(to: string, text: string): Promise<string> {
          const cmd = await prisma.workerCommand.create({
            data: {
              command: "SEND_WHATSAPP_LOCATION_REQUEST",
              payloadJson: JSON.stringify({ to, text }),
            },
          });
          return cmd.id;
        },
        async markAsRead(): Promise<void> {},
        async sendPresenceTyping(): Promise<void> {},
      };
    }

    return new BaileysAdapter(globalBaileysSocket);
  }

  /**
   * Retorna el tipo de proveedor activo
   */
  static async getActiveProviderType(): Promise<"META_CLOUD_API" | "BAILEYS_QR"> {
    const config = await prisma.whatsAppConfig.findFirst();
    const type = config?.activeProvider || process.env.WHATSAPP_ACTIVE_PROVIDER || "BAILEYS_QR";
    return type === "META_CLOUD_API" ? "META_CLOUD_API" : "BAILEYS_QR";
  }
}
