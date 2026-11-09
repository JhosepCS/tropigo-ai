import { IAAdapter, ChatMessage, CompletionOptions, CompletionResult, ConnectionTestResult } from "../types";

export class GeminiAdapter implements IAAdapter {
  readonly providerName = "gemini" as const;
  private apiKey?: string;
  private defaultModel: string;

  constructor(apiKey?: string, defaultModel = "gemini-1.5-flash") {
    this.apiKey = apiKey?.trim();
    this.defaultModel = defaultModel;
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey && this.apiKey.length > 0);
  }

  async testConnection(options?: { model?: string }): Promise<ConnectionTestResult> {
    const model = options?.model || this.defaultModel;
    if (!this.apiKey) {
      return {
        success: false,
        provider: "gemini",
        model,
        latencyMs: 0,
        error: "API Key de Gemini no configurada en el servidor.",
      };
    }

    const startTime = Date.now();
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "ping" }] }],
          generationConfig: { maxOutputTokens: 5, temperature: 0.1 },
        }),
      });

      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        let errorDetail = `HTTP ${res.status}`;
        try {
          const errJson = await res.json();
          errorDetail = errJson.error?.message || JSON.stringify(errJson);
        } catch {
          errorDetail = await res.text().catch(() => `HTTP ${res.status}`);
        }

        if (res.status === 400 && errorDetail.includes("API_KEY_INVALID")) {
          errorDetail = "Clave API de Gemini inválida en Google AI Studio.";
        } else if (res.status === 429) {
          errorDetail = "Límite de cuota gratuita (15 RPM / 1,500 RPD) alcanzado en Google AI Studio.";
        }

        return {
          success: false,
          provider: "gemini",
          model,
          latencyMs,
          error: `Gemini Error [${res.status}]: ${errorDetail}`,
        };
      }

      const data = await res.json();
      const sampleResponse = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "OK";

      return {
        success: true,
        provider: "gemini",
        model,
        latencyMs,
        sampleResponse,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: "gemini",
        model,
        latencyMs: Date.now() - startTime,
        error: `Fallo de conexión de red con Google Gemini: ${err.message}`,
      };
    }
  }

  async generateText(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY no está configurada.");
    }

    const model = options?.model || this.defaultModel;
    const startTime = Date.now();

    // Separar system instruction del resto de mensajes
    const systemMsg = messages.find((m) => m.role === "system");
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const bodyPayload: any = {
      contents,
      generationConfig: {
        temperature: options?.temperature ?? 0.3,
        maxOutputTokens: options?.maxTokens || 1024,
      },
    };

    if (systemMsg) {
      bodyPayload.systemInstruction = {
        parts: [{ text: systemMsg.content }],
      };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyPayload),
    });

    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      let errText = "";
      try {
        const errJson = await res.json();
        errText = errJson.error?.message || JSON.stringify(errJson);
      } catch {
        errText = await res.text().catch(() => "");
      }
      throw new Error(`Gemini API Error [${res.status}]: ${errText}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const content = candidate?.content?.parts?.[0]?.text || "";
    const tokensUsed = data.usageMetadata?.totalTokenCount;

    return {
      content,
      provider: "gemini",
      model,
      latencyMs,
      tokensUsed,
      fallbackUsed: false,
    };
  }
}
