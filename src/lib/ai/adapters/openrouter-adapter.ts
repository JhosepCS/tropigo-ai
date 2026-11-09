import { IAAdapter, ChatMessage, CompletionOptions, CompletionResult, ConnectionTestResult } from "../types";

export class OpenRouterAdapter implements IAAdapter {
  readonly providerName = "openrouter" as const;
  private apiKey?: string;
  private defaultModel: string;

  constructor(apiKey?: string, defaultModel = "meta-llama/llama-3.3-70b-instruct:free") {
    this.apiKey = apiKey?.trim();
    // Forzar que el modelo por defecto siempre sea de la capa gratuita :free
    this.defaultModel = defaultModel.endsWith(":free")
      ? defaultModel
      : "meta-llama/llama-3.3-70b-instruct:free";
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey && this.apiKey.length > 0);
  }

  /**
   * Garantiza que únicamente se ejecuten modelos de la capa comunitaria gratuita (:free)
   */
  private enforceFreeModel(modelCandidate?: string): string {
    const candidate = modelCandidate || this.defaultModel;
    if (!candidate.endsWith(":free")) {
      console.warn(
        `[OpenRouter Safety Guard] El modelo '${candidate}' no incluye la etiqueta ':free'. ` +
        `Reemplazando automáticamente por '${this.defaultModel}' para garantizar 0 Bs de costo.`
      );
      return this.defaultModel;
    }
    return candidate;
  }

  async testConnection(options?: { model?: string }): Promise<ConnectionTestResult> {
    const model = this.enforceFreeModel(options?.model);
    if (!this.apiKey) {
      return {
        success: false,
        provider: "openrouter",
        model,
        latencyMs: 0,
        error: "API Key de OpenRouter no configurada en el servidor.",
      };
    }

    const startTime = Date.now();
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://tropigo.app",
          "X-Title": "TropiGO AI Ivirgarzama",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 5,
          temperature: 0.1,
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

        if (res.status === 401) {
          errorDetail = "Clave API de OpenRouter inválida o no autorizada.";
        } else if (res.status === 402) {
          errorDetail = "OpenRouter solicitó créditos de pago. Solicitud bloqueada por la garantía 0 Bs.";
        } else if (res.status === 429) {
          errorDetail = "Límite de tasa en la capa libre :free alcanzado temporalmente en OpenRouter.";
        }

        return {
          success: false,
          provider: "openrouter",
          model,
          latencyMs,
          error: `OpenRouter Error [${res.status}]: ${errorDetail}`,
        };
      }

      const data = await res.json();
      const sampleResponse = data.choices?.[0]?.message?.content?.trim() || "OK";

      return {
        success: true,
        provider: "openrouter",
        model,
        latencyMs,
        sampleResponse,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: "openrouter",
        model,
        latencyMs: Date.now() - startTime,
        error: `Fallo de conexión de red con OpenRouter: ${err.message}`,
      };
    }
  }

  async generateText(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    if (!this.apiKey) {
      throw new Error("OPENROUTER_API_KEY no está configurada.");
    }

    const model = this.enforceFreeModel(options?.model);
    const startTime = Date.now();

    const bodyPayload: any = {
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? 0.3,
    };

    if (options?.maxTokens) {
      bodyPayload.max_tokens = options.maxTokens;
    }

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://tropigo.app",
        "X-Title": "TropiGO AI Ivirgarzama",
      },
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
      throw new Error(`OpenRouter API Error [${res.status}]: ${errText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";
    const tokensUsed = data.usage?.total_tokens;

    return {
      content,
      provider: "openrouter",
      model,
      latencyMs,
      tokensUsed,
      fallbackUsed: false,
    };
  }
}
