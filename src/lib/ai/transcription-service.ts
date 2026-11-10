export interface TranscriptionResult {
  text: string;
  error?: string;
}

/**
 * Adaptador para transcripción de audio usando Groq Whisper.
 * Elegido por su velocidad extrema y capa gratuita generosa.
 * Usa fetch nativo para no depender de axios.
 */
export class TranscriptionService {
  private static ENDPOINT = "https://api.groq.com/openai/v1/audio/transcriptions";

  static async transcribe(fileBuffer: Buffer, fileName: string): Promise<TranscriptionResult> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return { text: "", error: "API Key de Groq no configurada para transcripciones." };
    }

    try {
      const formData = new FormData();
      const bytes = new Uint8Array(fileBuffer);
      const mimeType = fileName.endsWith(".ogg")
        ? "audio/ogg"
        : fileName.endsWith(".mp3")
        ? "audio/mpeg"
        : fileName.endsWith(".wav")
        ? "audio/wav"
        : "audio/ogg";
      formData.append("file", new Blob([bytes], { type: mimeType }), fileName);
      formData.append("model", "whisper-large-v3");
      formData.append("response_format", "json");
      formData.append("language", "es");

      const response = await fetch(this.ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(`HTTP ${response.status} ${detail.slice(0, 200)}`);
      }

      const data = await response.json();
      return { text: String(data.text || "").trim() };
    } catch (error: any) {
      console.error("[TranscriptionService] Error:", error.message);
      return { text: "", error: `Error de transcripción: ${error.message}` };
    }
  }
}
