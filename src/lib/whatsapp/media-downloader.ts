import { WASocket, downloadMediaMessage } from "@whiskeysockets/baileys";
import pino from "pino";

export interface DownloadedMedia {
  buffer: Buffer;
  mimeType: string;
}

export class MediaDownloader {
  /**
   * Descarga el contenido binario de un mensaje de WhatsApp (audio, imagen,
   * documento o sticker) usando Baileys. No escribe en disco: devuelve el
   * buffer para enviarlo directamente al motor multimodal (Gemini/Whisper).
   */
  static async download(
    sock: WASocket,
    message: any
  ): Promise<DownloadedMedia | null> {
    try {
      const mediaType =
        message.message?.audioMessage ||
        message.message?.imageMessage ||
        message.message?.documentMessage ||
        message.message?.stickerMessage;
      if (!mediaType) return null;

      const buffer = await downloadMediaMessage(message, "buffer", {}, {
        logger: pino({ level: "silent" }) as any,
        // Permite recuperar medios antiguos cuyo archivo ya expiró en los
        // servidores de WhatsApp.
        reuploadRequest: sock.updateMediaMessage,
      });

      return {
        buffer,
        mimeType: mediaType.mimetype || "application/octet-stream",
      };
    } catch (error) {
      console.error("[MediaDownloader] Error downloading media:", error);
      return null;
    }
  }
}
