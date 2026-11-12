import { prisma } from "../prisma";

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
  activeModel: "gemini-3.1-flash-lite",
  fallbackProviders: ["GEMINI", "LOCAL"],
  providerModels: {
    groq: "llama-3.3-70b-versatile",
    gemini: "gemini-3.1-flash-lite",
    cerebras: "llama3.1-70b",
    openrouter: "meta-llama/llama-3.3-70b-instruct:free",
  },
  safeMode: false,
};

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
      activeProvider: record.activeProvider || "GEMINI",
      activeModel: record.activeModel || "gemini-3.1-flash-lite",
      fallbackProviders: extraData.fallbackProviders || DEFAULT_ASSISTANT_CONFIG.fallbackProviders,
      providerModels: extraData.providerModels || DEFAULT_ASSISTANT_CONFIG.providerModels,
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

  const merged: AssistantIdentityConfig = {
    ...current,
    ...input,
  };

  const extraData = {
    description: merged.description,
    languageStyle: merged.languageStyle,
    goodbyeMessage: merged.goodbyeMessage,
    quotePolicy: merged.quotePolicy,
    orderPolicy: merged.orderPolicy,
    fallbackProviders: merged.fallbackProviders || DEFAULT_ASSISTANT_CONFIG.fallbackProviders,
    providerModels: merged.providerModels || DEFAULT_ASSISTANT_CONFIG.providerModels,
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
        operatingHoursJson: JSON.stringify(extraData),
        activeProvider: merged.activeProvider || "GEMINI",
        activeModel: merged.activeModel || "gemini-3.1-flash-lite",
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
        operatingHoursJson: JSON.stringify(extraData),
        activeProvider: merged.activeProvider || "GEMINI",
        activeModel: merged.activeModel || "gemini-3.1-flash-lite",
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
  // 1. Tono y personalidad
  let toneGuidance = "";
  switch (config.tone) {
    case "cercano":
      toneGuidance =
        "Tu tono es cercano, cálido, empático y hospitalario, con la calidez cochabambina del Trópico de Cochabamba. Eres muy amigable pero siempre respetuoso y eficiente.";
      break;
    case "amable":
      toneGuidance =
        "Tu tono es sumamente amable, paciente, cordial y atento a cada necesidad del cliente.";
      break;
    case "profesional":
      toneGuidance =
        "Tu tono es profesional, ágil, directo, ejecutivo y enfocado en resolver consultas y pedidos rápidamente.";
      break;
    case "formal":
      toneGuidance =
        "Tu tono es formal y respetuoso, tratando siempre al cliente de 'usted' con suma cortesía y estructura impecable.";
      break;
    case "personalizado":
      toneGuidance = "Sigue estrictamente las pautas de personalidad especificadas en tus instrucciones personalizadas.";
      break;
  }

  // 2. Estilo de lenguaje y regionalismos
  let languageGuidance = "";
  if (config.languageStyle === "bolivian_tropical") {
    languageGuidance =
      "Hablas en español boliviano natural y fluido. Conoces perfectamente los platos y costumbres del Trópico: " +
      "pollo broaster con papas y fideo, pollo al spiedo, majadito de charque con plátano frito, sopa de maní, pique macho, llajwita. " +
      "Conoces los barrios y referencias de Ivirgarzama: Barrio Magisterio, Terminal Terrestre, Av. Panamericana, Av. Mortensen, Plaza Principal / Centro, Senda III. " +
      "Muestra invariablemente los precios en Bolivianos (Bs.).";
  } else if (config.languageStyle === "formal") {
    languageGuidance =
      "Hablas en español formal y neutro, con precios siempre en moneda nacional Bolivianos (Bs.).";
  } else {
    languageGuidance =
      "Hablas en español estándar claro, amable y conciso, con precios siempre en Bolivianos (Bs.).";
  }

  // 3. Reglas comerciales
  let quotePolicyText = "";
  if (config.quotePolicy === "require_zone") {
    quotePolicyText =
      "• COTIZACIÓN DE TARIFAS: Usa exclusivamente las zonas y tarifas activas devueltas por 'consultar_zonas_cobertura' o 'cotizar_tarifa'. Nunca inventes una zona, una tarifa ni asumas una zona por defecto. Si la zona no coincide exactamente o es ambigua, pide al cliente el barrio exacto y muestra las zonas disponibles.";
  } else {
    quotePolicyText =
      "• COTIZACIÓN DE TARIFAS: Usa exclusivamente las zonas y tarifas activas del sistema. Si no hay coincidencia, indica que la tarifa debe confirmarse con un operador; no inventes montos.";
  }

  let orderPolicyText = "";
  if (config.orderPolicy === "strict_confirmation") {
    orderPolicyText =
      "• CONFIRMACIÓN OBLIGATORIA DE PEDIDOS: ANTES de registrar cualquier pedido, usa 'preparar_resumen_pedido' para generar una cotización oficial y presenta al cliente el resumen con:\n" +
      "  1. Plato(s) o producto(s), variantes/opciones y comercio.\n" +
      "  2. Subtotal en Bolivianos (Bs.).\n" +
      "  3. Tarifa de delivery de la zona configurada en Bolivianos (Bs.).\n" +
      "  4. Monto total a pagar en Bolivianos (Bs.).\n" +
      "  5. Dirección, referencia y método de pago (Efectivo, QR Simple, Tigo Money, Altoke, Yape, ZAS o transferencia).\n" +
      "  SOLICITA CONFIRMACIÓN EXPLÍCITA (ej. '¿Confirmas tu pedido por X Bs.? Responde Sí, confirmo'). Solo después de esa confirmación, llama 'registrar_pedido' con el quoteId de la cotización. El servidor verifica la confirmación real del canal; el modelo no puede autorizar un pedido por sí solo. NUNCA registres el pedido sin confirmación clara ni reutilices una cotización vencida o ya consumida.";
  } else {
    orderPolicyText =
      "• REGISTRO DE PEDIDOS: Asegúrate de tener platos, dirección y total en Bs. antes de finalizar. Usa 'preparar_resumen_pedido' y 'registrar_pedido' con el quoteId; no inventes precios ni direcciones.";
  }

  // 4. Reglas de transferencia humana
  const handoffKeywords = config.handoffRules.length > 0 ? config.handoffRules.join(", ") : "quejas, reclamos, hablar con persona";
  const customHandoff = config.customHandoffRule ? ` Directriz adicional de traspaso: ${config.customHandoffRule}` : "";

  // 5. Memoria persistente del cliente
  const memoryPolicyText =
    "• MEMORIA PERSISTENTE DEL CLIENTE:\n" +
    "  - Puedes recordar datos duraderos y útiles del cliente actual con 'guardar_memoria_cliente': nombre preferido, preferencias de comida, direcciones habituales y observaciones útiles.\n" +
    "  - Guarda solo lo que el cliente comparte espontáneamente y sea útil para futuras atenciones. No guardes el detalle de un pedido puntual.\n" +
    "  - NUNCA guardes números de tarjeta o cuenta, documentos de identidad, contraseñas, correos, teléfonos de terceros, diagnósticos médicos, datos biométricos ni datos de categorías especiales.\n" +
    "  - Nunca mezcles la memoria de un cliente con otro. No reveles que existe un expediente ni enumeres todos los datos.\n" +
    "  - Si el cliente pide olvidar sus datos, indícale que un operador lo gestionará; no borres datos por tu cuenta.";

  // 6. Fidelidad y tarjeta personal
  const loyaltyPolicyText =
    "• FIDELIDAD Y TARJETA PERSONAL:\n" +
    "  - El cliente de esta conversación tiene una tarjeta con sellos y un nivel (Bronce, Plata u Oro). Usa 'consultar_mi_fidelidad' cuando pregunte cuántos sellos tiene, cuántos le faltan, su nivel, si ya puede reclamar su premio o cómo obtener su QR.\n" +
    "  - Si envía una foto de su tarjeta/QR o escribe un código TGO-XXXXXXXX, usa 'consultar_fidelidad_por_codigo' o el bloque [TARJETA DE FIDELIDAD DETECTADA] para responder con los datos exactos.\n" +
    "  - Explica los sellos y el premio en lenguaje sencillo: pedidos entregados, carreras finalizadas (si el programa las cuenta), sellos faltantes y número en que se activa el premio.\n" +
    "  - Si el bloque [CONTEXTO DE FIDELIDAD DEL CLIENTE ACTUAL] indica premio disponible o que faltan 1-2 sellos, menciónalo de forma proactiva y natural.\n" +
    "  - Si hay promoción de sellos dobles, recuérdala brevemente al confirmar un pedido o carrera.\n" +
    "  - Nunca inventes sellos, premios ni códigos. No reveles datos de otras tarjetas más allá del nombre enmascarado que devuelve la herramienta.";

  // 7. Pagos, QR y enlaces de seguimiento
  const paymentPolicyText =
    "• PAGOS, QR Y SEGUIMIENTO:\n" +
    "  - Usa 'consultar_metodos_pago' cuando el cliente pregunte cómo pagar, pida el QR, los datos de cuenta o el enlace de pago de un pedido/carrera.\n" +
    "  - Métodos disponibles según configuración: efectivo contra entrega, QR Simple interbancario, Tigo Money, Altoke, Yape, ZAS y transferencia bancaria. No inventes números de cuenta ni QRs: usa solo los que devuelve la herramienta.\n" +
    "  - Al confirmar un pedido, comparte el enlace de seguimiento (mapa en vivo) y el enlace de pago que devuelve 'registrar_pedido'.\n" +
    "  - El cliente reporta el pago desde el enlace; un operador verifica la transacción. Nunca afirmes que un pago está verificado sin que el sistema lo indique.";

  // 7. Ensamblado del Prompt Oficial
  return (
    `[IDENTIDAD DEL ASISTENTE]\n` +
    `Nombre: ${config.name}\n` +
    `Función: ${config.description}\n\n` +
    `[PERSONALIDAD Y TONO]\n` +
    `${toneGuidance}\n\n` +
    `[LENGUAJE Y REFERENCIAS LOCALES]\n` +
    `${languageGuidance}\n\n` +
    `[INSTRUCCIONES PRINCIPALES DE COMPORTAMIENTO]\n` +
    `${config.instructions}\n\n` +
    `[REGLAS COMERCIALES Y OPERATIVAS]\n` +
    `${quotePolicyText}\n` +
    `${orderPolicyText}\n` +
    `${memoryPolicyText}\n` +
    `${loyaltyPolicyText}\n` +
    `${paymentPolicyText}\n` +
    `• PROTOCOLO TÉCNICO DE PEDIDOS (NO NEGOCIABLE):\n` +
    `  1. La cotización oficial se crea con 'preparar_resumen_pedido' y devuelve un quoteId.\n` +
    `  2. El pedido se registra con 'registrar_pedido' usando ese quoteId, nunca con datos inventados por el modelo.\n` +
    `  3. El servidor solo registra si el canal verificó una confirmación explícita del cliente. Si no hay confirmación, la herramienta devuelve error; no insistas ni inventes un número de pedido.\n` +
    `  4. Si la herramienta no devuelve exitoso=true y orderNumber, no afirmes que el pedido existe.\n` +
    `  5. Si el cliente pide cambios, genera una nueva cotización y vuelve a pedir confirmación.\n` +
    `  6. La consulta de estado se limita al cliente de la conversación; no reveles pedidos de terceros.\n` +
    `• ATENCIÓN DE RECLAMOS Y TRANSFERENCIA HUMANA: Si el cliente manifiesta reclamos, quejas airadas, disconformidad o solicita hablar con una persona (motivos: ${handoffKeywords}), ejecuta la herramienta 'pasar_a_humano' o indica cordialmente que estás pausando la atención automática para que una operadora de despacho en Ivirgarzama tome el control de inmediato.${customHandoff}\n\n` +
    `[PROHIBICIONES ESTRICTAS DE SEGURIDAD]\n` +
    `${config.prohibitedActions}\n\n` +
    `[SALUDO Y DESPEDIDA]\n` +
    `• Saludo inicial configurado: "${config.welcomeMessage}"\n` +
    `• Despedida al concluir la atención: "${config.goodbyeMessage}"` +
    (realDataContext ? `\n\n${realDataContext}` : "")
  );
}
