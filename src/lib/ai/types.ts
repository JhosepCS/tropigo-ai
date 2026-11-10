export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: any[];
  toolChoice?: "auto" | "none";
  /**
   * Contexto confiable de la conversación/canal para las herramientas que
   * tocan pedidos. Nunca debe construirse a partir de texto generado por el
   * modelo: lo inyecta el servidor (webhook, CRM o script autorizado).
   */
  toolContext?: {
    customerId?: string;
    conversationId?: string;
    confirmationVerified?: boolean;
    operatorConfirmed?: boolean;
    source?: "WHATSAPP" | "WEBCHAT" | "CRM" | "PUBLIC" | "SYSTEM";
    actorUserId?: string;
    actorRole?: string;
  };
}

export interface ToolCallResult {
  tool: string;
  args: any;
  result: any;
}

export interface CompletionResult {
  content: string;
  provider: "groq" | "gemini" | "cerebras" | "openrouter" | "simulator";
  model: string;
  latencyMs: number;
  tokensUsed?: number;
  fallbackUsed: boolean;
  toolCalls?: ToolCallResult[];
  operatorHandoff?: boolean;
  alertAdmin?: boolean;
}

export interface ConnectionTestResult {
  success: boolean;
  provider: "groq" | "gemini" | "cerebras" | "openrouter" | "simulator";
  model: string;
  latencyMs: number;
  error?: string;
  sampleResponse?: string;
}

export interface IAAdapter {
  readonly providerName: "groq" | "gemini" | "cerebras" | "openrouter" | "simulator";
  isAvailable(): Promise<boolean>;
  generateText(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResult>;
  testConnection(options?: { model?: string }): Promise<ConnectionTestResult>;
}

export interface AIProviderStatus {
  provider: "groq" | "gemini" | "cerebras" | "openrouter" | "simulator";
  name: string;
  status: "ACTIVE" | "PENDING_KEY" | "DISABLED" | "TRIAL";
  configuredModel: string;
  availableModels: string[];
  maskedKey?: string;
  isFreeVerified: boolean;
  notes: string;
  limits: {
    rpm?: number;
    rpd?: number;
    tpm?: number;
    details: string;
  };
}

/**
 * Catálogo oficial de modelos verificados para garantizar 0 Bs.
 * Modelos vigentes sin versiones obsoletas ni de pago forzado.
 */
export const VERIFIED_MODELS_CATALOG: Record<
  "groq" | "gemini" | "cerebras" | "openrouter" | "simulator",
  { id: string; name: string; isFree: boolean; description: string }[]
> = {
  groq: [
    {
      id: "llama-3.3-70b-versatile",
      name: "Llama 3.3 70B Versatile (Recomendado)",
      isFree: true,
      description: "Modelo principal ultra-rápido, 128k contexto. 30 RPM / 1,000 RPD gratis.",
    },
    {
      id: "llama-3.1-8b-instant",
      name: "Llama 3.1 8B Instant",
      isFree: true,
      description: "Latencia mínima extrema para respuestas de catálogo y tarifas rápidas.",
    },
  ],
  gemini: [
    {
      id: "gemini-3.1-flash-lite",
      name: "Gemini 3.1 Flash Lite (Recomendado)",
      isFree: true,
      description:
        "Modelo multimodal vigente y gratuito: texto, visión (fotos de menús/comprobantes) y transcripción de audio. Ideal para atención por WhatsApp.",
    },
    {
      id: "gemini-flash-lite-latest",
      name: "Gemini Flash Lite Latest",
      isFree: true,
      description: "Alias rotativo de Google al modelo Flash Lite más reciente disponible.",
    },
    {
      id: "gemini-3.8-flash",
      name: "Gemini 3.8 Flash",
      isFree: true,
      description: "Mayor capacidad de razonamiento multimodal. Puede estar saturado; se usa como respaldo.",
    },
  ],
  cerebras: [
    {
      id: "llama3.1-70b",
      name: "Llama 3.1 70B (Cerebras Inference)",
      isFree: true,
      description: "Inferencia acelerada por hardware Wafer-Scale. Sujeto a cuotas developer trial.",
    },
    {
      id: "llama3.1-8b",
      name: "Llama 3.1 8B",
      isFree: true,
      description: "Modelo compacto de alta frecuencia en la nube de Cerebras.",
    },
    {
      id: "llama-3.3-70b",
      name: "Llama 3.3 70B",
      isFree: true,
      description: "Modelo de 70 mil millones de parámetros con alta capacidad de razonamiento.",
    },
  ],
  openrouter: [
    {
      id: "meta-llama/llama-3.3-70b-instruct:free",
      name: "Llama 3.3 70B Instruct (:free)",
      isFree: true,
      description: "Capa comunitaria gratuita de OpenRouter. Garantía estricta 0 Bs.",
    },
    {
      id: "meta-llama/llama-3.1-8b-instruct:free",
      name: "Llama 3.1 8B Instruct (:free)",
      isFree: true,
      description: "Modelo gratuito rápido comunitario sin costo por token.",
    },
    {
      id: "mistralai/mistral-7b-instruct:free",
      name: "Mistral 7B Instruct (:free)",
      isFree: true,
      description: "Modelo libre de respaldo para tareas estándar.",
    },
  ],
  simulator: [
    {
      id: "local-ivirgarzama-v1",
      name: "Simulador Local Ivirgarzama (0 Bs. Continuo)",
      isFree: true,
      description: "Motor local de contingencia sin dependencias externas. Catálogo y tarifas de Ivirgarzama.",
    },
  ],
};
