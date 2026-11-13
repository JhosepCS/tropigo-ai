import {
  IAAdapter,
  ChatMessage,
  CompletionOptions,
  CompletionResult,
  ConnectionTestResult,
} from "../types";
import {
  DEFAULT_OPENROUTER_MODEL,
  normalizeProviderModel,
} from "../model-defaults";

/**
 * Detecta cuando OpenRouter rechaza un modelo porque dejó de ser gratuito,
 * ya no existe o no está disponible para la cuenta. Se reintenta una vez con
 * el enrutador gratuito vigente.
 */
function isUnavailableModelError(status: number, detail: string): boolean {
  if (status !== 404 && status !== 400) return false;
  const text = (detail || "").toLowerCase();
  return (
    text.includes("unavailable") ||
    text.includes("does not exist") ||
    text.includes("not found") ||
    text.includes("no longer") ||
    text.includes("not available")
  );
}

export class OpenRouterAdapter implements IAAdapter {
  readonly providerName = "openrouter" as const;
  private apiKey?: string;
  private defaultModel: string;

  constructor(apiKey?: string, defaultModel = DEFAULT_OPENROUTER_MODEL) {
    this.apiKey = apiKey?.trim();
    this.defaultModel =
      normalizeProviderModel("openrouter", defaultModel) ||
      DEFAULT_OPENROUTER_MODEL;
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey && this.apiKey.length > 0);
  }

  /**
   * Garantiza que únicamente se ejecuten modelos de la capa comunitaria
   * gratuita (`:free` u `openrouter/free`).
   */
  private enforceFreeModel(modelCandidate?: string): string {
    const candidate = normalizeProviderModel(
      "openrouter",
      modelCandidate || this.defaultModel
    );
    if (!candidate) return DEFAULT_OPENROUTER_MODEL;

    if (
      candidate !== DEFAULT_OPENROUTER_MODEL &&
      !candidate.endsWith(":free")
    ) {
      console.warn(
        `[OpenRouter Safety Guard] El modelo '${candidate}' no pertenece a la capa gratuita. ` +
          `Reemplazando automáticamente por '${DEFAULT_OPENROUTER_MODEL}' para garantizar 0 Bs de costo.`
      );
      return DEFAULT_OPENROUTER_MODEL;
    }

    return candidate;
  }

  private async callChat(
    model: string,
    body: Record<string, unknown>
  ): Promise<Response> {
    return fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://tropigo.app",
        "X-Title": "TropiGO AI Ivirgarzama",
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
    let model = this.enforceFreeModel(options?.model);
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
      let res = await this.callChat(model, {
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 5,
        temperature: 0.1,
      });

      let errorDetail = "";
      if (!res.ok) {
        errorDetail = await this.readError(res);

        if (
          isUnavailableModelError(res.status, errorDetail) &&
          model !== DEFAULT_OPENROUTER_MODEL
        ) {
          model = DEFAULT_OPENROUTER_MODEL;
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
          errorDetail = "Clave API de OpenRouter inválida o no autorizada.";
        } else if (res.status === 402) {
          errorDetail = "OpenRouter solicitó créditos de pago. Solicitud bloqueada por la garantía 0 Bs.";
        } else if (res.status === 429) {
          errorDetail = "Límite de tasa en la capa libre alcanzado temporalmente en OpenRouter.";
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

    let model = this.enforceFreeModel(options?.model);
    const startTime = Date.now();

    const buildBody = (
      maxTokens?: number,
      disableReasoning = false
    ): Record<string, unknown> => {
      const body: Record<string, unknown> = {
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: options?.temperature ?? 0.3,
      };

      // Algunos modelos gratuitos (Nemotron, Dots, etc.) consumen todo el
      // presupuesto en "reasoning" y devuelven content vacío. Se desactiva
      // solo en el reintento, porque ciertos endpoints exigen razonamiento.
      if (disableReasoning) {
        body.reasoning = { enabled: false };
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
          // Ignorar argumentos malformados de un modelo gratuito.
        }
      }

      return { content, toolCalls, tokensUsed: data.usage?.total_tokens };
    };

    let res = await this.callChat(model, buildBody(options?.maxTokens));
    let errText = "";

    if (!res.ok) {
      errText = await this.readError(res);

      if (
        isUnavailableModelError(res.status, errText) &&
        model !== DEFAULT_OPENROUTER_MODEL
      ) {
        console.warn(
          `[OpenRouterAdapter] El modelo '${model}' no está disponible en la capa gratuita. Reintentando con '${DEFAULT_OPENROUTER_MODEL}'.`
        );
        model = DEFAULT_OPENROUTER_MODEL;
        res = await this.callChat(model, buildBody(options?.maxTokens));
        if (!res.ok) errText = await this.readError(res);
      }
    }

    if (!res.ok) {
      throw new Error(`OpenRouter API Error [${res.status}]: ${errText}`);
    }

    let parsed = parseCompletion(await res.json());

    // Algunos modelos gratuitos agotan el presupuesto en razonamiento y
    // devuelven content vacío. Se reintenta con más margen y razonamiento
    // desactivado; si el endpoint lo exige, se reintenta sin desactivarlo.
    if (!parsed.content.trim() && parsed.toolCalls.length === 0) {
      const retryBudget = Math.max(options?.maxTokens || 0, 1200);
      console.warn(
        `[OpenRouterAdapter] Respuesta vacía de '${model}'. Reintentando con ${retryBudget} tokens.`
      );

      res = await this.callChat(model, buildBody(retryBudget, true));

      if (!res.ok) {
        errText = await this.readError(res);
        if (errText.toLowerCase().includes("reasoning is mandatory")) {
          res = await this.callChat(model, buildBody(retryBudget, false));
          if (!res.ok) errText = await this.readError(res);
        }
      }

      if (!res.ok) {
        throw new Error(`OpenRouter API Error [${res.status}]: ${errText}`);
      }

      parsed = parseCompletion(await res.json());
    }

    if (!parsed.content.trim() && parsed.toolCalls.length === 0) {
      throw new Error(
        `OpenRouter devolvió una respuesta vacía con el modelo '${model}'.`
      );
    }

    const latencyMs = Date.now() - startTime;

    return {
      content: parsed.content,
      provider: "openrouter",
      model,
      latencyMs,
      tokensUsed: parsed.tokensUsed,
      fallbackUsed: false,
      toolCalls: parsed.toolCalls.length > 0 ? parsed.toolCalls : undefined,
    };
  }
}
