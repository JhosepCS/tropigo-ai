import { prisma } from "../prisma";
import { IWhatsAppProvider } from "./types";
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
   * Obtiene el proveedor de WhatsApp (Baileys)
   */
  static async getAdapter(): Promise<IWhatsAppProvider> {
    if (globalBaileysSocket) {
      return new BaileysAdapter(globalBaileysSocket);
    }

    // Si estamos en el proceso web, encolamos el comando para que el worker de Baileys lo ejecute
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
}
