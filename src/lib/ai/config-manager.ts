import { prisma } from "../prisma";
import {
  DEFAULT_CEREBRAS_MODEL,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GROQ_MODEL,
  DEFAULT_OPENROUTER_MODEL,
  defaultModelForProvider,
  normalizeProviderModel,
} from "./model-defaults";

export type WeekdayKey =
  | "domingo"
  | "lunes"
  | "martes"
  | "miercoles"
  | "jueves"
  | "viernes"
  | "sabado";

export interface DaySchedule {
  open: string; // "08:00"
  close: string; // "23:00"
  closed?: boolean;
}

export type OperatingHours = Partial<Record<WeekdayKey, DaySchedule | null>>;
export type OffHoursPolicy = "TAKE_MESSAGE" | "CONTINUE_AND_BOOK";

export interface QuickReplyConfig {
  /** Texto visible en el botón (máximo 20 caracteres en WhatsApp). */
  label: string;
  /** Mensaje canónico que se procesa como si el cliente lo hubiera escrito. */
  message: string;
  /** Permite ocultar una respuesta rápida sin borrarla. */
  enabled?: boolean;
}

export interface AssistantIdentityConfig {
  id?: string;
  name: string;
  avatarUrl: string;
  description: string;
  tone: "cercano" | "amable" | "profesional" | "formal" | "personalizado";
  languageStyle: "bolivian_tropical" | "standard_spanish" | "formal";
  welcomeMessage: string;
  goodbyeMessage: string;
  instructions: string;
  prohibitedActions: string;
  quotePolicy: "require_zone" | "flexible";
  orderPolicy: "strict_confirmation" | "standard";
  handoffRules: string[];
  customHandoffRule?: string;
  activeProvider: string;
  activeModel: string;
  fallbackProviders?: string[];
  providerModels?: Record<string, string>;
  operatingHours?: OperatingHours;
  /** Si es false, el asistente atiende 24/7 y no aplica el horario. */
  operatingHoursEnabled?: boolean;
  offHoursPolicy?: OffHoursPolicy;
  /** Mensaje automático fuera de horario. Admite {nextOpen}. */
  offHoursMessage?: string;
  /** Botones de respuesta rápida del menú principal (máximo 3). */
  quickReplies?: QuickReplyConfig[];
  safeMode?: boolean;
  updatedAt?: string;
}

export const DEFAULT_ASSISTANT_CONFIG: AssistantIdentityConfig = {
  name: "TropiBot",
  avatarUrl: "/avatar-tropigo.png",
  description: "Asistente virtual de delivery, pedidos y atención al cliente en Ivirgarzama, Trópico de Cochabamba.",
  tone: "cercano",
  languageStyle: "bolivian_tropical",
  welcomeMessage:
    "¡Hola! 👋 Te habla TropiBot, tu asistente de TropiGO en Ivirgarzama. ¿Qué se te antoja pedir hoy? Tenemos delivery de comida de los mejores restaurantes, farmacia, mandados y mototaxis.",
  goodbyeMessage:
    "¡Gracias por comunicarte con TropiGO! Movemos el trópico contigo 🌴🛵 Que tengas un excelente día.",
  instructions:
    "Eres TropiBot, el asistente inteligente oficial de TropiGO en Ivirgarzama (Trópico de Cochabamba, Bolivia). Atiendes a los clientes por WhatsApp y Web de forma ágil, respetuosa y con calidez cochabambina. Muestra precios siempre en Bolivianos (Bs.). Para pedidos de comida pide siempre confirmación de los platos, ubicación o referencia clara y método de pago (Efectivo o QR Simple). Para mototaxis, solicita el punto de partida y destino para cotizar la tarifa.",
  prohibitedActions:
    "1. Nunca inventes precios o comercios que no existan en el catálogo oficial de Ivirgarzama.\n2. Nunca confirmes un pedido final sin dirección, ubicación o referencia clara y método de pago.\n3. Si un cliente reclama airadamente o el mensaje es incomprensible, deriva inmediatamente a un operador humano.\n4. No proporciones diagnósticos médicos ni recomendaciones farmacológicas.",
  quotePolicy: "require_zone",
  orderPolicy: "strict_confirmation",
  handoffRules: ["queja", "reclamo", "pide hablar con alguien", "no sabe la respuesta", "urgencia", "audio ininteligible"],
  customHandoffRule: "Pausar respuestas y transferir de inmediato si el cliente manifiesta inconformidad con un pedido previo o solicita hablar con una persona.",
  activeProvider: "GEMINI",
  activeModel: DEFAULT_GEMINI_MODEL,
  fallbackProviders: ["GEMINI", "LOCAL"],
  providerModels: {
    groq: DEFAULT_GROQ_MODEL,
    gemini: DEFAULT_GEMINI_MODEL,
    cerebras: DEFAULT_CEREBRAS_MODEL,
    openrouter: DEFAULT_OPENROUTER_MODEL,
  },
  operatingHours: {},
  operatingHoursEnabled: false,
  offHoursPolicy: "TAKE_MESSAGE",
  offHoursMessage: "",
  quickReplies: [
    {
      label: "🍕 Pedir comida",
      message: "Quiero ver los restaurantes y pedir comida",
      enabled: true,
    },
    {
      label: "🛵 Mototaxi",
      message: "Quiero pedir un mototaxi",
      enabled: true,
    },
    {
      label: "🎁 Mi Fidelidad",
      message: "Quiero consultar mi tarjeta de fidelidad y sellos",
      enabled: true,
    },
  ],
  safeMode: false,
};

/**
 * Limpia los modelos guardados en la base de datos: si un proveedor cambió o
 * retiró un modelo, se reemplaza por el vigente sin obligar al operador a
 * volver a configurar el CRM.
 */
function normalizeProviderModels(
  input: Record<string, string> | undefined | null
): Record<string, string> {
  const merged: Record<string, string> = {
    ...DEFAULT_ASSISTANT_CONFIG.providerModels,
    ...(input || {}),
  };

  for (const provider of Object.keys(merged)) {
    const normalized = normalizeProviderModel(provider, merged[provider]);
    merged[provider] = normalized || defaultModelForProvider(provider);
  }

  return merged;
}

/**
 * Obtiene la configuración actual del asistente desde Supabase.
 * Si no existe, crea y retorna la configuración predeterminada.
 */
export async function getAssistantConfig(): Promise<AssistantIdentityConfig> {
  try {
    let record = await prisma.assistantConfig.findFirst();

    if (!record) {
      record = await prisma.assistantConfig.create({
        data: {
          name: DEFAULT_ASSISTANT_CONFIG.name,
          avatarUrl: DEFAULT_ASSISTANT_CONFIG.avatarUrl,
          tone: DEFAULT_ASSISTANT_CONFIG.tone,
          welcomeMessage: DEFAULT_ASSISTANT_CONFIG.welcomeMessage,
          instructions: DEFAULT_ASSISTANT_CONFIG.instructions,
          prohibitedActions: DEFAULT_ASSISTANT_CONFIG.prohibitedActions,
          handoffRules: JSON.stringify(DEFAULT_ASSISTANT_CONFIG.handoffRules),
          customHandoffRule: DEFAULT_ASSISTANT_CONFIG.customHandoffRule,
          operatingHoursJson: JSON.stringify({
            description: DEFAULT_ASSISTANT_CONFIG.description,
            languageStyle: DEFAULT_ASSISTANT_CONFIG.languageStyle,
            goodbyeMessage: DEFAULT_ASSISTANT_CONFIG.goodbyeMessage,
            quotePolicy: DEFAULT_ASSISTANT_CONFIG.quotePolicy,
            orderPolicy: DEFAULT_ASSISTANT_CONFIG.orderPolicy,
            fallbackProviders: DEFAULT_ASSISTANT_CONFIG.fallbackProviders,
            providerModels: DEFAULT_ASSISTANT_CONFIG.providerModels,
          }),
          activeProvider: "GEMINI",
          activeModel: "gemini-3.1-flash-lite",
          safeMode: false,
        },
      });
    }

    let extraData: any = {};
    try {
      if (record.operatingHoursJson) {
        extraData = JSON.parse(record.operatingHoursJson);
      }
    } catch {}

    let parsedHandoff: string[] = DEFAULT_ASSISTANT_CONFIG.handoffRules;
    try {
      if (record.handoffRules) {
        parsedHandoff = JSON.parse(record.handoffRules);
      }
    } catch {}

    const activeProvider = record.activeProvider || DEFAULT_ASSISTANT_CONFIG.activeProvider;
    const activeModel =
      normalizeProviderModel(activeProvider, record.activeModel) ||
      defaultModelForProvider(activeProvider);

    let parsedOperatingHours: OperatingHours = DEFAULT_ASSISTANT_CONFIG.operatingHours || {};
    try {
      if (record.operatingHours) {
        parsedOperatingHours = JSON.parse(record.operatingHours);
      }
    } catch {}

    const offHoursPolicy = (record.offHoursPolicy as OffHoursPolicy) || DEFAULT_ASSISTANT_CONFIG.offHoursPolicy || "TAKE_MESSAGE";
    const operatingHoursEnabled =
      typeof extraData.operatingHoursEnabled === "boolean"
        ? extraData.operatingHoursEnabled
        : Object.keys(parsedOperatingHours).length > 0;

    return {
      id: record.id,
      name: record.name || DEFAULT_ASSISTANT_CONFIG.name,
      avatarUrl: record.avatarUrl || DEFAULT_ASSISTANT_CONFIG.avatarUrl,
      description: extraData.description || DEFAULT_ASSISTANT_CONFIG.description,
      tone: (record.tone as any) || DEFAULT_ASSISTANT_CONFIG.tone,
      languageStyle: extraData.languageStyle || DEFAULT_ASSISTANT_CONFIG.languageStyle,
      welcomeMessage: record.welcomeMessage || DEFAULT_ASSISTANT_CONFIG.welcomeMessage,
      goodbyeMessage: extraData.goodbyeMessage || DEFAULT_ASSISTANT_CONFIG.goodbyeMessage,
      instructions: record.instructions || DEFAULT_ASSISTANT_CONFIG.instructions,
      prohibitedActions: record.prohibitedActions || DEFAULT_ASSISTANT_CONFIG.prohibitedActions,
      quotePolicy: extraData.quotePolicy || DEFAULT_ASSISTANT_CONFIG.quotePolicy,
      orderPolicy: extraData.orderPolicy || DEFAULT_ASSISTANT_CONFIG.orderPolicy,
      handoffRules: parsedHandoff,
      customHandoffRule: record.customHandoffRule || DEFAULT_ASSISTANT_CONFIG.customHandoffRule,
      activeProvider,
      activeModel,
      fallbackProviders: extraData.fallbackProviders || DEFAULT_ASSISTANT_CONFIG.fallbackProviders,
      providerModels: normalizeProviderModels(extraData.providerModels),
      operatingHours: parsedOperatingHours,
      operatingHoursEnabled,
      offHoursPolicy,
      offHoursMessage: extraData.offHoursMessage || DEFAULT_ASSISTANT_CONFIG.offHoursMessage || "",
      quickReplies: Array.isArray(extraData.quickReplies)
        ? extraData.quickReplies
        : DEFAULT_ASSISTANT_CONFIG.quickReplies,
      safeMode: record.safeMode ?? false,
      updatedAt: record.updatedAt?.toISOString(),
    };
  } catch (error) {
    console.warn("Fallo al leer AssistantConfig de BD, usando valores por defecto:", error);
    return DEFAULT_ASSISTANT_CONFIG;
  }
}

/**
 * Guarda o actualiza la configuración del asistente en Supabase.
 */
export async function saveAssistantConfig(
  input: Partial<AssistantIdentityConfig>
): Promise<AssistantIdentityConfig> {
  const current = await getAssistantConfig();

  // Ignorar campos undefined para no borrar configuración existente cuando
  // el panel guarda solo una sección (por ejemplo, proveedores o promociones).
  const definedInput = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  ) as Partial<AssistantIdentityConfig>;

  const merged: AssistantIdentityConfig = {
    ...current,
    ...definedInput,
  };

  // Nunca guardar identificadores retirados: se traducen al modelo vigente.
  merged.activeProvider = merged.activeProvider || DEFAULT_ASSISTANT_CONFIG.activeProvider;
  merged.activeModel =
    normalizeProviderModel(merged.activeProvider, merged.activeModel) ||
    defaultModelForProvider(merged.activeProvider);
  merged.providerModels = normalizeProviderModels(merged.providerModels);

  const extraData = {
    description: merged.description,
    languageStyle: merged.languageStyle,
    goodbyeMessage: merged.goodbyeMessage,
    quotePolicy: merged.quotePolicy,
    orderPolicy: merged.orderPolicy,
    fallbackProviders: merged.fallbackProviders || DEFAULT_ASSISTANT_CONFIG.fallbackProviders,
    providerModels: merged.providerModels,
    operatingHoursEnabled: merged.operatingHoursEnabled ?? false,
    offHoursMessage: merged.offHoursMessage || "",
    quickReplies: (merged.quickReplies || DEFAULT_ASSISTANT_CONFIG.quickReplies || []).slice(0, 3),
  };

  const existing = await prisma.assistantConfig.findFirst();

  let updatedRecord;
  if (existing) {
    updatedRecord = await prisma.assistantConfig.update({
      where: { id: existing.id },
      data: {
        name: merged.name.trim(),
        avatarUrl: merged.avatarUrl.trim(),
        tone: merged.tone,
        welcomeMessage: merged.welcomeMessage.trim(),
        instructions: merged.instructions.trim(),
        prohibitedActions: merged.prohibitedActions.trim(),
        handoffRules: JSON.stringify(merged.handoffRules),
        customHandoffRule: merged.customHandoffRule ? merged.customHandoffRule.trim() : null,
        operatingHours: JSON.stringify(merged.operatingHours || {}),
        operatingHoursJson: JSON.stringify(extraData),
        offHoursPolicy: merged.offHoursPolicy || "TAKE_MESSAGE",
        activeProvider: merged.activeProvider,
        activeModel: merged.activeModel,
        safeMode: merged.safeMode ?? false,
      },
    });
  } else {
    updatedRecord = await prisma.assistantConfig.create({
      data: {
        name: merged.name.trim(),
        avatarUrl: merged.avatarUrl.trim(),
        tone: merged.tone,
        welcomeMessage: merged.welcomeMessage.trim(),
        instructions: merged.instructions.trim(),
        prohibitedActions: merged.prohibitedActions.trim(),
        handoffRules: JSON.stringify(merged.handoffRules),
        customHandoffRule: merged.customHandoffRule ? merged.customHandoffRule.trim() : null,
        operatingHours: JSON.stringify(merged.operatingHours || {}),
        operatingHoursJson: JSON.stringify(extraData),
        offHoursPolicy: merged.offHoursPolicy || "TAKE_MESSAGE",
        activeProvider: merged.activeProvider,
        activeModel: merged.activeModel,
        safeMode: merged.safeMode ?? false,
      },
    });
  }

  return {
    ...merged,
    id: updatedRecord.id,
    updatedAt: updatedRecord.updatedAt.toISOString(),
  };
}

/**
 * Restaura la configuración a los valores predeterminados de fábrica.
 */
export async function resetAssistantConfig(): Promise<AssistantIdentityConfig> {
  return saveAssistantConfig(DEFAULT_ASSISTANT_CONFIG);
}

/**
 * Compila y construye dinámicamente el System Prompt oficial que se inyecta
 * al motor de IA multimodelo (Groq, Gemini, OpenRouter, Cerebras o Simulador).
 * Opcionalmente integra el contexto de datos en tiempo real de la base de datos de TropiGO.
 */
export function buildSystemPrompt(
  config: AssistantIdentityConfig,
  realDataContext?: string
): string {
  const toneMap: Record<AssistantIdentityConfig["tone"], string> = {
    cercano: "cercano, cálido y ágil, con calidez del Trópico de Cochabamba",
    amable: "amable, cordial y paciente",
    profesional: "profesional, directo y ejecutivo",
    formal: "formal y respetuoso, tratando de 'usted'",
    personalizado: "según tus instrucciones personalizadas",
  };
  const toneGuidance = toneMap[config.tone] || toneMap.cercano;

  const languageGuidance =
    config.languageStyle === "bolivian_tropical"
      ? "Español boliviano natural. Conoces platos típicos (broaster, spiedo, majadito, sopa de maní, pique) y zonas de Ivirgarzama (Magisterio, Terminal, Panamericana, Mortensen, Plaza Principal, Senda III). Precios siempre en Bs."
      : config.languageStyle === "formal"
      ? "Español formal neutro. Precios siempre en Bolivianos (Bs.)."
      : "Español claro y conciso. Precios siempre en Bolivianos (Bs.).";

  const handoffKeywords =
    config.handoffRules.length > 0
      ? config.handoffRules.join(", ")
      : "quejas, reclamos, hablar con persona";
  const customHandoff = config.customHandoffRule ? ` ${config.customHandoffRule}` : "";

  const quoteRule =
    config.quotePolicy === "require_zone"
      ? "Usa solo zonas/tarifas de 'consultar_zonas_cobertura' o 'cotizar_tarifa'. Si es ambigua, pide barrio exacto."
      : "Usa solo zonas/tarifas del sistema; nunca inventes montos.";

  const orderRule =
    config.orderPolicy === "strict_confirmation"
      ? "Pide confirmación explícita ('Sí, confirmo') tras mostrar 'resumenTexto' de 'preparar_resumen_pedido'. Solo después llama 'registrar_pedido' con ese quoteId."
      : "Genera 'preparar_resumen_pedido' y tras confirmación llama 'registrar_pedido' con el quoteId.";

  return (
    `Eres ${config.name} (${config.description}). Tono: ${toneGuidance}. ${languageGuidance}\n` +
    `Instrucciones: ${config.instructions}\n\n` +
    `[REGLAS OPERATIVAS]\n` +
    `1. Identidad: El WhatsApp ya identifica al cliente. Nunca pidas registro, cuenta, sesión ni teléfono; pide su nombre una sola vez si falta.\n` +
    `2. Verdad única: Jamás inventes comercios, platos, precios, zonas, pagos ni números de pedido. Usa siempre las herramientas.\n` +
    `3. Flujo de pedido (guía paso a paso, 1 dato a la vez): (a) confirma producto/cantidad con 'consultar_catalogo', (b) pide barrio/referencia o GPS (si falta GPS en delivery usa 'solicitar_ubicacion'; si ya está en [UBICACIÓN GUARDADA], no la pidas otra vez), (c) llama 'preparar_resumen_pedido', (d) ${orderRule}\n` +
    `4. Tarifas y GPS: ${quoteRule} Delivery = zona + recargo por km desde Plaza Principal (pasa lat/lng si hay GPS). No asignes repartidores manualmente.\n` +
    `5. Pagos y Fidelidad: Para métodos/QR usa 'consultar_metodos_pago'; para estado de pago usa 'consultar_mis_pagos'. Solo confirma pago verificado si [COMPROBANTE DE PAGO PROCESADO] dice PAGO VERIFICADO. Para sellos/premios usa 'consultar_mi_fidelidad' o 'consultar_fidelidad_por_codigo'.\n` +
    `6. Traspaso humano: Ante reclamos, urgencias o si pide persona (${handoffKeywords}), ejecuta 'pasar_a_humano'.${customHandoff}\n` +
    `7. Prohibiciones: ${config.prohibitedActions}\n\n` +
    `[ESTILO WHATSAPP — OBLIGATORIO]\n` +
    `• Sé breve y directo: máximo 2 a 4 líneas cortas (≤ 260 caracteres) en charla normal.\n` +
    `• Haz UNA sola pregunta concreta por mensaje para avanzar el pedido (ej: qué desea, su barrio o método de pago).\n` +
    `• Usa máximo 2 emojis por mensaje. No repitas saludos, menús ni lo que el cliente ya escribió.\n` +
    `• Si piden menú, muestra máximo 3 a 5 opciones con precio. Solo el resumen oficial de pedido ('RESUMEN DE TU PEDIDO') puede ser largo.\n` +
    `• Despedida al cerrar: "${config.goodbyeMessage}"` +
    (realDataContext ? `\n\n${realDataContext}` : "")
  );
}
