import { WASocket } from "@whiskeysockets/baileys";
import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";

export class MediaDownloader {
  static async download(sock: WASocket, message: any, folder: string): Promise<{ filePath: string; mimeType: string } | null> {
    try {
      const mediaType = message.audioMessage || message.imageMessage || message.documentMessage || message.stickerMessage;
      if (!mediaType) return null;

      const stream = await sock.downloadMediaMessage(message);
      if (!stream) return null;

      const buffer = await stream.toArray().then(chunks => Buffer.concat(chunks));

      const mimeType = mediaType.mimetype || "application/octet-stream";
      const ext = mimeType.split("/")[1] || "bin";
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = path.join(folder, fileName);

      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
      }

      fs.writeFileSync(filePath, buffer);

      return { filePath, mimeType };
    } catch (error) {
      console.error("[MediaDownloader] Error downloading media:", error);
      return null;
    }
  }
}
