import { IAAdapter, ChatMessage, CompletionOptions, CompletionResult, ConnectionTestResult } from "../types";

function sanitizeGeminiSchema(value: any): any {
  if (Array.isArray(value)) return value.map(sanitizeGeminiSchema);
  if (!value || typeof value !== "object") return value;

  const result: Record<string, any> = {};
  for (const [key, child] of Object.entries(value)) {
    // Gemini no acepta estas palabras clave del JSON Schema de OpenAI.
    if (
      ["additionalProperties", "$schema", "$id", "$ref", "definitions", "title", "default", "examples"].includes(
        key
      )
    ) {
      continue;
    }
    result[key] = sanitizeGeminiSchema(child);
  }
  return result;
}

function toGeminiTools(tools: any[]): any[] | undefined {
  const declarations = (tools || [])
    .filter((tool) => tool?.type === "function" && tool?.function?.name)
    .map((tool) => ({
      name: tool.function.name,
      description: tool.function.description || "",
      parameters: sanitizeGeminiSchema(tool.function.parameters || { type: "object", properties: {} }),
    }));

  return declarations.length > 0 ? [{ functionDeclarations: declarations }] : undefined;
}

export class GeminiAdapter implements IAAdapter {
  readonly providerName = "gemini" as const;
  private apiKey?: string;
  private defaultModel: string;

  constructor(apiKey?: string, defaultModel = "gemini-3.1-flash-lite") {
    this.apiKey = apiKey?.trim();
    this.defaultModel = defaultModel;
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey && this.apiKey.length > 0);
  }

  private modelCandidates(requestedModel: string): string[] {
    return Array.from(
      new Set(
        [
          requestedModel,
          this.defaultModel,
          "gemini-3.1-flash-lite",
          "gemini-flash-lite-latest",
          "gemini-3.8-flash",
        ].filter(Boolean)
      )
    );
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
          errorDetail = "Límite de cuota gratuita alcanzado en Google AI Studio.";
        } else if (res.status === 503) {
          errorDetail = "El modelo está saturado en este momento. Se reintentará con otro modelo.";
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
      const sampleResponse =
        (data.candidates?.[0]?.content?.parts || [])
          .map((part: any) => part?.text || "")
          .join("")
          .trim() || "OK";

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

    const requestedModel = options?.model || this.defaultModel;
    const systemMsg = messages.find((m) => m.role === "system");
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const geminiTools = options?.tools ? toGeminiTools(options.tools) : undefined;
    const bodyPayload: any = {
      contents,
      generationConfig: {
        temperature: options?.temperature ?? 0.3,
        maxOutputTokens: options?.maxTokens || 1400,
      },
    };

    if (systemMsg) {
      bodyPayload.systemInstruction = {
        parts: [{ text: systemMsg.content }],
      };
    }

    if (geminiTools) {
      bodyPayload.tools = geminiTools;
      bodyPayload.toolConfig = {
        functionCallingConfig: {
          mode: options?.toolChoice === "none" ? "NONE" : "AUTO",
        },
      };
    }

    let lastError: any = null;
    const startTime = Date.now();

    for (const model of this.modelCandidates(requestedModel)) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyPayload),
        });

        if (!res.ok) {
          let errText = "";
          try {
            const errJson = await res.json();
            errText = errJson.error?.message || JSON.stringify(errJson);
          } catch {
            errText = await res.text().catch(() => "");
          }

          lastError = new Error(`Gemini API Error [${res.status}]: ${errText}`);

          // Modelo retirado, cuota agotada o saturación: probar el siguiente.
          if ([404, 429, 503].includes(res.status)) {
            console.warn(`[GeminiAdapter] ${model} no disponible (${res.status}). Probando respaldo...`);
            continue;
          }

          throw lastError;
        }

        const data = await res.json();
        const candidate = data.candidates?.[0];
        const parts = candidate?.content?.parts || [];

        const content = parts
          .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
          .filter(Boolean)
          .join("\n")
          .trim();

        const toolCalls: any[] = [];
        for (const part of parts) {
          if (part?.functionCall?.name) {
            toolCalls.push({
              tool: part.functionCall.name,
              args: part.functionCall.args || {},
              result: null,
            });
          }
        }

        if (!content && toolCalls.length === 0) {
          lastError = new Error(
            `Gemini devolvió una respuesta vacía (finishReason: ${candidate?.finishReason || "desconocido"}).`
          );
          continue;
        }

        return {
          content,
          provider: "gemini",
          model,
          latencyMs: Date.now() - startTime,
          tokensUsed: data.usageMetadata?.totalTokenCount,
          fallbackUsed: false,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        };
      } catch (err: any) {
        lastError = err;
        // Error de red o de formato: no tiene sentido repetir el mismo cuerpo.
        if (!/Gemini API Error \[(404|429|503)\]/.test(String(err?.message))) {
          throw err;
        }
      }
    }

    throw lastError || new Error("No se pudo obtener respuesta de Gemini.");
  }
}
