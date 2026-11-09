import { IAAdapter, ChatMessage, CompletionOptions, CompletionResult, ConnectionTestResult } from "../types";

export class GroqAdapter implements IAAdapter {
  readonly providerName = "groq" as const;
  private apiKey?: string;
  private defaultModel: string;

  constructor(apiKey?: string, defaultModel = "llama-3.3-70b-versatile") {
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
        provider: "groq",
        model,
        latencyMs: 0,
        error: "API Key de Groq no configurada en el servidor.",
      };
    }

    const startTime = Date.now();
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
          errorDetail = "Clave API de Groq inválida o revocada.";
        } else if (res.status === 429) {
          errorDetail = "Límite de tasa (RPM) excedido temporalmente en la capa gratuita de Groq.";
        }

        return {
          success: false,
          provider: "groq",
          model,
          latencyMs,
          error: `Groq Error [${res.status}]: ${errorDetail}`,
        };
      }

      const data = await res.json();
      const sampleResponse = data.choices?.[0]?.message?.content?.trim() || "OK";

      return {
        success: true,
        provider: "groq",
        model,
        latencyMs,
        sampleResponse,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: "groq",
        model,
        latencyMs: Date.now() - startTime,
        error: `Fallo de conexión de red con Groq: ${err.message}`,
      };
    }
  }

  async generateText(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    if (!this.apiKey) {
      throw new Error("GROQ_API_KEY no está configurada.");
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

    if (options?.tools && options.tools.length > 0) {
      bodyPayload.tools = options.tools;
      bodyPayload.tool_choice = options.toolChoice || "auto";
    }

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyPayload),
    });

    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      let errDetail = "";
      try {
        const errJson = await res.json();
        errDetail = errJson.error?.message || JSON.stringify(errJson);
      } catch {
        errDetail = await res.text().catch(() => "");
      }
      throw new Error(`Groq API Error [${res.status}]: ${errDetail}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const content = choice?.message?.content || "";
    const tokensUsed = data.usage?.total_tokens;

    const toolCalls: any[] = [];
    if (choice?.message?.tool_calls) {
      for (const call of choice.message.tool_calls) {
        try {
          toolCalls.push({
            tool: call.function.name,
            args: JSON.parse(call.function.arguments || "{}"),
            result: null,
          });
        } catch {}
      }
    }

    return {
      content,
      provider: "groq",
      model,
      latencyMs,
      tokensUsed,
      fallbackUsed: false,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }
}
