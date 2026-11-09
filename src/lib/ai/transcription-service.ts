import axios from "axios";

export interface TranscriptionResult {
  text: string;
  error?: string;
}

/**
 * Adaptador para transcripción de audio usando Groq Whisper.
 * Elegido por su velocidad extrema y capa gratuita generosa.
 */
export class TranscriptionService {
  private static API_KEY = process.env.GROQ_API_KEY;
  private static ENDPOINT = "https://api.groq.com/openai/v1/audio/transcriptions";

  static async transcribe(fileBuffer: Buffer, fileName: string): Promise<TranscriptionResult> {
    if (!this.API_KEY) {
      return { text: "", error: "API Key de Groq no configurada para transcripciones." };
    }

    try {
      const formData = new FormData();
      const blob = new Blob([fileBuffer]);
      formData.append("file", blob, fileName);
      formData.append("model", "whisper-large-v3");
      formData.append("response_format", "json");

      const response = await axios.post(this.ENDPOINT, formData, {
        headers: {
          Authorization: `Bearer ${this.API_KEY}`,
          "Content-Type": "multipart/form-data",
        },
      });

      return { text: response.data.text };
    } catch (error: any) {
      console.error("[TranscriptionService] Error:", error.response?.data || error.message);
      return { text: "", error: `Error de transcripción: ${error.message}` };
    }
  }
}
