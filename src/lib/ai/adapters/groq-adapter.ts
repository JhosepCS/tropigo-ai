import {
  IAAdapter,
  ChatMessage,
  CompletionOptions,
  CompletionResult,
  ConnectionTestResult,
} from "../types";
import { DEFAULT_GROQ_MODEL, normalizeProviderModel } from "../model-defaults";

/**
 * Detecta respuestas de Groq cuando el modelo solicitado ya no existe o fue
 * retirado del catálogo. En ese caso se reintenta una vez con el modelo
 * vigente para no romper la conversación del cliente.
 */
function isRetiredModelError(status: number, detail: string): boolean {
  if (status !== 404 && status !== 400) return false;
  const text = (detail || "").toLowerCase();
  return (
    text.includes("model") &&
    (text.includes("does not exist") ||
      text.includes("not found") ||
      text.includes("decommission") ||
      text.includes("not supported") ||
      text.includes("no longer"))
  );
}

export class GroqAdapter implements IAAdapter {
  readonly providerName = "groq" as const;
  private apiKey?: string;
  private defaultModel: string;

  constructor(apiKey?: string, defaultModel = DEFAULT_GROQ_MODEL) {
    this.apiKey = apiKey?.trim();
    this.defaultModel =
      normalizeProviderModel("groq", defaultModel) || DEFAULT_GROQ_MODEL;
  }

  private resolveModel(model?: string): string {
    return normalizeProviderModel("groq", model || this.defaultModel) || DEFAULT_GROQ_MODEL;
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey && this.apiKey.length > 0);
  }

  private async callChat(
    model: string,
    body: Record<string, unknown>
  ): Promise<Response> {
    return fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...body, model }),
    });
  }

  private async readError(res: Response): Promise<string> {
    try {
      const errJson = await res.json();
      return errJson.error?.message || JSON.stringify(errJson);
    } catch {
      return await res.text().catch(() => `HTTP ${res.status}`);
    }
  }

  async testConnection(options?: { model?: string }): Promise<ConnectionTestResult> {
    let model = this.resolveModel(options?.model);
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
      let res = await this.callChat(model, {
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 5,
        temperature: 0.1,
      });

      let errorDetail = "";
      if (!res.ok) {
        errorDetail = await this.readError(res);

        // Reintento automático si el modelo configurado fue retirado.
        if (isRetiredModelError(res.status, errorDetail) && model !== DEFAULT_GROQ_MODEL) {
          model = DEFAULT_GROQ_MODEL;
          res = await this.callChat(model, {
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 5,
            temperature: 0.1,
          });
          if (!res.ok) errorDetail = await this.readError(res);
        }
      }

      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
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

    let model = this.resolveModel(options?.model);
    const startTime = Date.now();

    const buildBody = (maxTokens?: number): Record<string, unknown> => {
      const body: Record<string, unknown> = {
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: options?.temperature ?? 0.3,
      };

      // En los modelos GPT-OSS el razonamiento puede consumir todo el
      // presupuesto y dejar el content vacío. Se limita a "low" para que la
      // respuesta visible siempre tenga tokens disponibles.
      if (model.includes("gpt-oss")) {
        body.reasoning_effort = "low";
      }

      if (maxTokens) {
        body.max_tokens = maxTokens;
      }

      if (options?.tools && options.tools.length > 0) {
        body.tools = options.tools;
        body.tool_choice = options.toolChoice || "auto";
      }

      return body;
    };

    const parseCompletion = (data: any) => {
      const choice = data.choices?.[0];
      const content: string = choice?.message?.content || "";
      const toolCalls: any[] = [];

      for (const call of choice?.message?.tool_calls || []) {
        try {
          toolCalls.push({
            tool: call.function?.name,
            args: JSON.parse(call.function?.arguments || "{}"),
            result: null,
          });
        } catch {
          // Ignorar argumentos malformados.
        }
      }

      return { content, toolCalls, tokensUsed: data.usage?.total_tokens };
    };

    let res = await this.callChat(model, buildBody(options?.maxTokens));
    let errDetail = "";

    if (!res.ok) {
      errDetail = await this.readError(res);

      // Si el modelo guardado ya no existe, reintentar con el vigente.
      if (isRetiredModelError(res.status, errDetail) && model !== DEFAULT_GROQ_MODEL) {
        console.warn(
          `[GroqAdapter] El modelo '${model}' ya no está disponible. Reintentando con '${DEFAULT_GROQ_MODEL}'.`
        );
        model = DEFAULT_GROQ_MODEL;
        res = await this.callChat(model, buildBody(options?.maxTokens));
        if (!res.ok) errDetail = await this.readError(res);
      }
    }

    if (!res.ok) {
      throw new Error(`Groq API Error [${res.status}]: ${errDetail}`);
    }

    let parsed = parseCompletion(await res.json());

    // Reintento con más presupuesto si el modelo devolvió una respuesta vacía.
    if (!parsed.content.trim() && parsed.toolCalls.length === 0) {
      const retryBudget = Math.max(options?.maxTokens || 0, 1200);
      console.warn(
        `[GroqAdapter] Respuesta vacía de '${model}'. Reintentando con ${retryBudget} tokens.`
      );
      res = await this.callChat(model, buildBody(retryBudget));

      if (!res.ok) {
        errDetail = await this.readError(res);
        throw new Error(`Groq API Error [${res.status}]: ${errDetail}`);
      }

      parsed = parseCompletion(await res.json());
    }

    if (!parsed.content.trim() && parsed.toolCalls.length === 0) {
      throw new Error(`Groq devolvió una respuesta vacía con el modelo '${model}'.`);
    }

    const latencyMs = Date.now() - startTime;

    return {
      content: parsed.content,
      provider: "groq",
      model,
      latencyMs,
      tokensUsed: parsed.tokensUsed,
      fallbackUsed: false,
      toolCalls: parsed.toolCalls.length > 0 ? parsed.toolCalls : undefined,
    };
  }
}
