import { IAAdapter, ChatMessage, CompletionOptions, CompletionResult, ConnectionTestResult } from "../types";

export class CerebrasAdapter implements IAAdapter {
  readonly providerName = "cerebras" as const;
  private apiKey?: string;
  private defaultModel: string;

  constructor(apiKey?: string, defaultModel = "llama3.1-70b") {
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
        provider: "cerebras",
        model,
        latencyMs: 0,
        error: "API Key de Cerebras no configurada en el servidor.",
      };
    }

    const startTime = Date.now();
    try {
      const res = await fetch("https://api.cerebras.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
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
          errorDetail = "Clave API de Cerebras inválida o no autorizada en cloud.cerebras.ai.";
        } else if (res.status === 429) {
          errorDetail = "Cuota developer de Cerebras excedida temporalmente.";
        }

        return {
          success: false,
          provider: "cerebras",
          model,
          latencyMs,
          error: `Cerebras Error [${res.status}]: ${errorDetail}`,
        };
      }

      const data = await res.json();
      const sampleResponse = data.choices?.[0]?.message?.content?.trim() || "OK";

      return {
        success: true,
        provider: "cerebras",
        model,
        latencyMs,
        sampleResponse,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: "cerebras",
        model,
        latencyMs: Date.now() - startTime,
        error: `Fallo de conexión de red con Cerebras: ${err.message}`,
      };
    }
  }

  async generateText(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    if (!this.apiKey) {
      throw new Error("CEREBRAS_API_KEY no está configurada.");
    }

    const model = options?.model || this.defaultModel;
    const startTime = Date.now();

    const bodyPayload: any = {
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? 0.3,
    };

    if (options?.maxTokens) {
      bodyPayload.max_tokens = options.maxTokens;
    }

    const res = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
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
      throw new Error(`Cerebras API Error [${res.status}]: ${errText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";
    const tokensUsed = data.usage?.total_tokens;

    return {
      content,
      provider: "cerebras",
      model,
      latencyMs,
      tokensUsed,
      fallbackUsed: false,
    };
  }
}
