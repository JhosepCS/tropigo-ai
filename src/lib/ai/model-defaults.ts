/**
 * Modelos vigentes y normalización de identificadores retirados.
 *
 * Groq retiró `llama-3.3-70b-versatile` y `llama-3.1-8b-instant` del catálogo
 * público. OpenRouter dejó de ofrecer `meta-llama/llama-3.3-70b-instruct:free`
 * en su capa gratuita. Para que una base de datos antigua (o una configuración
 * guardada en el CRM) no rompa el asistente, cualquier modelo retirado se
 * traduce automáticamente al reemplazo gratuito vigente.
 */

export const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";
export const DEFAULT_GROQ_FAST_MODEL = "openai/gpt-oss-20b";
export const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite";
export const DEFAULT_OPENROUTER_MODEL = "openrouter/free";
export const DEFAULT_CEREBRAS_MODEL = "llama3.1-70b";
export const DEFAULT_SIMULATOR_MODEL = "local-ivirgarzama-v1";

/**
 * Identificadores que ya no existen o que dejaron de ser gratuitos.
 * El valor es el modelo vigente que los reemplaza.
 */
const RETIRED_MODELS: Record<string, string> = {
  // Groq: retirados del catálogo en 2026.
  "llama-3.3-70b-versatile": DEFAULT_GROQ_MODEL,
  "llama-3.1-8b-instant": DEFAULT_GROQ_FAST_MODEL,
  "llama3-70b-8192": DEFAULT_GROQ_MODEL,
  "llama3-8b-8192": DEFAULT_GROQ_FAST_MODEL,
  "mixtral-8x7b-32768": DEFAULT_GROQ_MODEL,

  // OpenRouter: el slug :free de Llama 3.3 dejó de estar disponible.
  "meta-llama/llama-3.3-70b-instruct:free": DEFAULT_OPENROUTER_MODEL,
  "meta-llama/llama-3.1-8b-instruct:free": DEFAULT_OPENROUTER_MODEL,
  "mistralai/mistral-7b-instruct:free": DEFAULT_OPENROUTER_MODEL,
  "anthropic/claude-3.5-haiku": DEFAULT_OPENROUTER_MODEL,
};

export function defaultModelForProvider(provider?: string | null): string {
  switch ((provider || "").toUpperCase()) {
    case "GROQ":
      return DEFAULT_GROQ_MODEL;
    case "GEMINI":
      return DEFAULT_GEMINI_MODEL;
    case "OPENROUTER":
      return DEFAULT_OPENROUTER_MODEL;
    case "CEREBRAS":
      return DEFAULT_CEREBRAS_MODEL;
    case "LOCAL":
    case "SIMULATOR":
      return DEFAULT_SIMULATOR_MODEL;
    default:
      return DEFAULT_GEMINI_MODEL;
  }
}

/**
 * Devuelve un identificador de modelo utilizable por el proveedor.
 * - Traduce modelos retirados a su reemplazo vigente.
 * - En OpenRouter fuerza la capa gratuita (`:free` u `openrouter/free`).
 */
export function normalizeProviderModel(
  provider: string | null | undefined,
  model: string | null | undefined
): string | undefined {
  if (!model) return undefined;

  const trimmed = model.trim();
  if (!trimmed) return undefined;

  const replacement = RETIRED_MODELS[trimmed];
  if (replacement) return replacement;

  if (provider?.toLowerCase() === "openrouter") {
    if (trimmed === DEFAULT_OPENROUTER_MODEL) return trimmed;
    if (!trimmed.endsWith(":free")) return DEFAULT_OPENROUTER_MODEL;
  }

  return trimmed;
}

/**
 * Indica si un modelo es de la capa gratuita de OpenRouter.
 */
export function isFreeOpenRouterModel(model?: string | null): boolean {
  if (!model) return false;
  const normalized = normalizeProviderModel("openrouter", model);
  return normalized === DEFAULT_OPENROUTER_MODEL || Boolean(normalized?.endsWith(":free"));
}
