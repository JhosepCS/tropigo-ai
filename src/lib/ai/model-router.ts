import {
  ChatMessage,
  CompletionOptions,
  CompletionResult,
  AIProviderStatus,
  ConnectionTestResult,
  VERIFIED_MODELS_CATALOG,
  IAAdapter,
} from "./types";
import { getProviderKeys, maskKey } from "./key-manager";
import { getAssistantConfig, AssistantIdentityConfig } from "./config-manager";
import { GroqAdapter } from "./adapters/groq-adapter";
import { GeminiAdapter } from "./adapters/gemini-adapter";
import { CerebrasAdapter } from "./adapters/cerebras-adapter";
import { OpenRouterAdapter } from "./adapters/openrouter-adapter";
import { LocalSimulatorAdapter } from "./adapters/local-simulator";

export class ModelRouter {
  /**
   * Obtiene el estado detallado de todos los proveedores configurados para el CRM
   */
  static async getProvidersStatus(): Promise<AIProviderStatus[]> {
    const keys = await getProviderKeys();
    const config = await getAssistantConfig();

    return [
      {
        provider: "groq",
        name: "Groq Cloud (Llama 3.3 70B & 8B)",
        status: keys.groqKey ? "ACTIVE" : "PENDING_KEY",
        configuredModel:
          config.providerModels?.groq || "llama-3.3-70b-versatile",
        availableModels: VERIFIED_MODELS_CATALOG.groq.map((m) => m.id),
        maskedKey: maskKey(keys.groqKey),
        isFreeVerified: true,
        notes: "Velocidad extrema en LPU. 30 RPM, 1,000 req/día, 100k tokens/día gratis sin tarjeta de crédito.",
        limits: {
          rpm: 30,
          rpd: 1000,
          tpm: 100000,
          details: "Capa gratuita permanente Groq Cloud (Free Tier).",
        },
      },
      {
        provider: "gemini",
        name: "Google Gemini 3.x (Texto + Visión + Audio)",
        status: keys.geminiKey ? "ACTIVE" : "PENDING_KEY",
        configuredModel: config.providerModels?.gemini || "gemini-3.1-flash-lite",
        availableModels: VERIFIED_MODELS_CATALOG.gemini.map((m) => m.id),
        maskedKey: maskKey(keys.geminiKey),
        isFreeVerified: true,
        notes:
          "Motor principal gratuito: conversación, fotos de menús/comprobantes y transcripción de notas de voz en un solo proveedor.",
        limits: {
          rpm: 15,
          rpd: 1500,
          tpm: 1000000,
          details: "Capa gratuita Google AI Studio (sin cobro automático).",
        },
      },
      {
        provider: "openrouter",
        name: "OpenRouter (Capa Comunitaria :free)",
        status: keys.openRouterKey ? "ACTIVE" : "PENDING_KEY",
        configuredModel:
          config.providerModels?.openrouter || "meta-llama/llama-3.3-70b-instruct:free",
        availableModels: VERIFIED_MODELS_CATALOG.openrouter.map((m) => m.id),
        maskedKey: maskKey(keys.openRouterKey),
        isFreeVerified: true,
        notes: "Garantía estricta 0 Bs. Solo ejecuta modelos con sufijo :free para evitar cualquier cargo.",
        limits: {
          rpm: 20,
          details: "Modelos comunitarios libres :free sin consumo de saldo.",
        },
      },
      {
        provider: "cerebras",
        name: "Cerebras Cloud (Inference Trial)",
        status: keys.cerebrasKey ? "TRIAL" : "PENDING_KEY",
        configuredModel: config.providerModels?.cerebras || "llama3.1-70b",
        availableModels: VERIFIED_MODELS_CATALOG.cerebras.map((m) => m.id),
        maskedKey: maskKey(keys.cerebrasKey),
        isFreeVerified: false,
        notes: "Hardware Wafer-Scale ultra veloz. Requiere developer key de cloud.cerebras.ai (crédito de prueba/developer).",
        limits: {
          rpm: 30,
          tpm: 60000,
          details: "Developer trial tier. Sujeto a políticas de Cerebras.",
        },
      },
      {
        provider: "simulator",
        name: "Simulador Local Ivirgarzama",
        status: "ACTIVE",
        configuredModel: "local-ivirgarzama-v1",
        availableModels: ["local-ivirgarzama-v1"],
        isFreeVerified: true,
        notes: "Motor local de contingencia 0 Bs. Responde con restaurantes y tarifas de Ivirgarzama si no hay API Keys.",
        limits: {
          details: "Sin límite de solicitudes ni costo. Ejecución 100% en el servidor.",
        },
      },
    ];
  }

  /**
   * Crea la instancia del adaptador para un proveedor dado
   */
  static async getAdapterForProvider(
    provider: string,
    keyOverride?: string,
    modelOverride?: string
  ): Promise<IAAdapter> {
    const keys = await getProviderKeys();
    const config = await getAssistantConfig();
    const normProvider = provider.toLowerCase();

    switch (normProvider) {
      case "groq":
        return new GroqAdapter(
          keyOverride || keys.groqKey,
          modelOverride || config.providerModels?.groq || "llama-3.3-70b-versatile"
        );
      case "gemini":
        return new GeminiAdapter(
          keyOverride || keys.geminiKey,
          modelOverride || config.providerModels?.gemini || "gemini-3.1-flash-lite"
        );
      case "cerebras":
        return new CerebrasAdapter(
          keyOverride || keys.cerebrasKey,
          modelOverride || config.providerModels?.cerebras || "llama3.1-70b"
        );
      case "openrouter":
        return new OpenRouterAdapter(
          keyOverride || keys.openRouterKey,
          modelOverride || config.providerModels?.openrouter || "meta-llama/llama-3.3-70b-instruct:free"
        );
      case "simulator":
      case "local":
      default:
        return new LocalSimulatorAdapter();
    }
  }

  /**
   * Prueba la conexión real contra la API de un proveedor y retorna tiempos y errores reales
   */
  static async testProviderConnection(
    provider: "groq" | "gemini" | "cerebras" | "openrouter" | "simulator",
    keyOverride?: string,
    modelOverride?: string
  ): Promise<ConnectionTestResult> {
    const adapter = await this.getAdapterForProvider(provider, keyOverride, modelOverride);
    return adapter.testConnection({ model: modelOverride });
  }

  /**
   * Ejecuta una llamada de conversación con selección de proveedor principal y fallback autorizado
   */
  static async executeChat(
    messages: ChatMessage[],
    options?: CompletionOptions,
    customConfig?: AssistantIdentityConfig
  ): Promise<CompletionResult> {
    const config = customConfig || (await getAssistantConfig());
    const keys = await getProviderKeys();

    // 1. Determinar proveedor principal configurado en el CRM.
    // Gemini es el motor gratuito principal (texto + visión + audio).
    const primaryProvider = (config.activeProvider || "GEMINI").toLowerCase();
    const primaryModel =
      config.activeModel || options?.model || "gemini-3.1-flash-lite";

    // 2. Construir adaptadores
    const groq = new GroqAdapter(keys.groqKey, config.providerModels?.groq || "llama-3.3-70b-versatile");
    const gemini = new GeminiAdapter(
      keys.geminiKey,
      config.providerModels?.gemini || "gemini-3.1-flash-lite"
    );
    const openrouter = new OpenRouterAdapter(keys.openRouterKey, config.providerModels?.openrouter || "meta-llama/llama-3.3-70b-instruct:free");
    const cerebras = new CerebrasAdapter(keys.cerebrasKey, config.providerModels?.cerebras || "llama3.1-70b");
    const simulator = new LocalSimulatorAdapter();

    // 3. Mapear proveedores disponibles
    const adapterMap: Record<string, { name: any; adapter: IAAdapter }> = {
      groq: { name: "groq", adapter: groq },
      gemini: { name: "gemini", adapter: gemini },
      openrouter: { name: "openrouter", adapter: openrouter },
      cerebras: { name: "cerebras", adapter: cerebras },
      simulator: { name: "simulator", adapter: simulator },
      local: { name: "simulator", adapter: simulator },
    };

    // 4. Armar el plan de ejecución:
    // Primero el seleccionado en AI Studio; luego fallbacks autorizados; finalmente el simulador local.
    const executionPlan: Array<{ name: any; adapter: IAAdapter; model?: string }> = [];

    // Validar que el modelo seleccionado sea gratuito antes de añadirlo al plan
    const validateFreeModel = (provider: string, model?: string) => {
      if (!model) return true; // Si no hay modelo, el adaptador usa su default (que asumimos gratuito)

      // Restricción estricta: OpenRouter solo permite modelos con sufijo :free
      if (provider === "openrouter" && !model.endsWith(":free")) {
        return false;
      }

      // Se puede expandir la lista de modelos prohibidos aquí
      const prohibitedKeywords = ["opus", "gpt-4", "claude-3-5-sonnet"];
      if (prohibitedKeywords.some(kw => model.toLowerCase().includes(kw))) {
        return false;
      }

      return true;
    };

    // Proveedor principal
    if (adapterMap[primaryProvider]) {
      const primary = adapterMap[primaryProvider];
      if (await primary.adapter.isAvailable() && validateFreeModel(primaryProvider, primaryModel)) {
        executionPlan.push({ ...primary, model: primaryModel });
      } else if (!validateFreeModel(primaryProvider, primaryModel)) {
        console.error(`[ModelRouter] Bloqueo de seguridad: El modelo ${primaryModel} de ${primaryProvider} no es gratuito.`);
      }
    }

    // Proveedores de respaldo autorizados (gratuitos)
    const fallbacks = config.fallbackProviders || ["GEMINI", "LOCAL"];
    for (const fb of fallbacks) {
      const norm = fb.toLowerCase();
      if (norm !== primaryProvider && adapterMap[norm]) {
        const item = adapterMap[norm];
        if (await item.adapter.isAvailable() && validateFreeModel(norm)) {
          // Evitar duplicados
          if (!executionPlan.some((p) => p.name === item.name)) {
            executionPlan.push(item);
          }
        }
      }
    }

    // Simulador siempre presente como último recurso de contingencia 0 Bs.
    if (!executionPlan.some((p) => p.name === "simulator")) {
      executionPlan.push({ name: "simulator", adapter: simulator });
    }

    let lastError: any = null;
    let hadExternalAttempt = false;

    for (let i = 0; i < executionPlan.length; i++) {
      const step = executionPlan[i];
      if (step.name !== "simulator") {
        hadExternalAttempt = true;
      }

      try {
        const callOptions: CompletionOptions = {
          ...options,
          model: step.model || options?.model,
        };

        const result = await step.adapter.generateText(messages, callOptions);

        if (i > 0) {
          result.fallbackUsed = true;
          console.warn(
            `[ModelRouter] Respuesta obtenida mediante fallback: ${step.name} (intentos previos con error: ${lastError?.message || "N/A"})`
          );
        }

        return result;
      } catch (err: any) {
        lastError = err;
        console.warn(`[ModelRouter] Fallo en proveedor ${step.name}:`, err.message);
        // Continuar de inmediato al siguiente proveedor autorizado
      }
    }

    // Si fallaron los proveedores externos y se llega al simulador local
    const fallbackResult = await simulator.generateText(messages, options);
    fallbackResult.fallbackUsed = true;
    if (hadExternalAttempt && lastError) {
      fallbackResult.alertAdmin = true;
      console.error(
        `[ModelRouter Alerta Administrador] Todos los proveedores externos configurados fallaron. Último error: ${lastError.message}`
      );
    }

    return fallbackResult;
  }
}
