import { prisma } from "../prisma";

// =================================================================
// MEMORIA PERSISTENTE DEL CLIENTE
// =================================================================

export const MEMORY_CATEGORIES = [
  "PERFIL",
  "PREFERENCIA",
  "DIRECCION",
  "OBSERVACION",
] as const;

export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

export const MEMORY_CATEGORY_LABELS: Record<MemoryCategory, string> = {
  PERFIL: "Perfil",
  PREFERENCIA: "Preferencia",
  DIRECCION: "Dirección habitual",
  OBSERVACION: "Observación útil",
};

const MAX_FACTS_PER_CUSTOMER = 40;
const MAX_KEY_LENGTH = 60;
const MAX_VALUE_LENGTH = 400;
const MAX_PROMPT_FACTS = 30;
const MAX_PROMPT_SUMMARIES = 5;
const MAX_PROMPT_SUMMARY_CHARS = 700;

export interface MemoryFactInput {
  category: string;
  key: string;
  value: string;
}

export interface MemoryMutationOptions {
  source?: string;
  actorUserId?: string | null;
  /**
   * Solo el CRM puede escribir mientras la memoria está desactivada.
   * La IA nunca usa este flag.
   */
  ignoreOptOut?: boolean;
}

interface SensitiveCheck {
  sensitive: boolean;
  reason?: string;
}

// Patrones de datos que no deben persistirse como memoria.
// No se bloquean alergias alimentarias: son necesarias para preparar un
// pedido de forma segura. Sí se bloquean diagnósticos y datos financieros.
const SENSITIVE_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\b(?:\d[ -]*?){13,19}\b/, reason: "número de tarjeta o cuenta" },
  { pattern: /\b(cvv|cvc|código de seguridad|codigo de seguridad)\b/i, reason: "código de seguridad de tarjeta" },
  {
    pattern: /\b(ci|cedula|cédula|documento de identidad|pasaporte|dni)\b[\s:#-]*\d{5,}/i,
    reason: "documento de identidad",
  },
  {
    pattern:
      /\b(cuenta bancaria|nro\.? de cuenta|número de cuenta|numero de cuenta|iban|swift|tarjeta de crédito|tarjeta de debito|tarjeta de débito)\b/i,
    reason: "datos bancarios",
  },
  {
    pattern: /\b(contraseña|contrasena|password|clave de acceso|pin de seguridad)\b/i,
    reason: "credenciales de acceso",
  },
  {
    pattern: /\b(huella digital|iris|reconocimiento facial|biometría|biometria)\b/i,
    reason: "datos biométricos",
  },
  {
    pattern:
      /\b(diagnóstico|diagnostico|enfermedad terminal|vih|cáncer|cancer|diabetes|embarazo)\b/i,
    reason: "datos de salud sensibles",
  },
  {
    pattern:
      /\b(religión|religion|afiliación política|afiliacion politica|orientación sexual|orientacion sexual)\b/i,
    reason: "datos sensibles de categoría especial",
  },
  {
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
    reason: "correo electrónico",
  },
  { pattern: /\b\d{7,}\b/, reason: "número largo (posible teléfono o documento)" },
];

export function normalizeMemoryKey(key: string): string {
  return String(key || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, MAX_KEY_LENGTH);
}

export function isSensitiveMemoryValue(value: string, key = ""): SensitiveCheck {
  const haystack = `${key} ${value}`.trim();
  for (const rule of SENSITIVE_PATTERNS) {
    if (rule.pattern.test(haystack)) {
      return { sensitive: true, reason: rule.reason };
    }
  }
  return { sensitive: false };
}

/**
 * Oculta datos sensibles que pudieran aparecer en resúmenes históricos.
 * Los resúmenes son necesarios para el historial, pero no deben conservar
 * tarjetas, correos ni números largos.
 */
export function redactSensitiveText(text: string): string {
  return String(text || "")
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[dato financiero omitido]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[correo omitido]")
    .replace(/\b\d{7,}\b/g, "[número omitido]");
}

export function validateMemoryInput(
  input: MemoryFactInput
):
  | { ok: true; category: MemoryCategory; key: string; keyNormalized: string; value: string }
  | { ok: false; error: string } {
  const category = String(input.category || "").trim().toUpperCase() as MemoryCategory;

  if (!MEMORY_CATEGORIES.includes(category)) {
    return {
      ok: false,
      error: `Categoría inválida. Usa una de: ${MEMORY_CATEGORIES.join(", ")}.`,
    };
  }

  const key = String(input.key || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .trim()
    .replace(/\s+/g, " ");

  if (key.length < 2 || key.length > MAX_KEY_LENGTH) {
    return {
      ok: false,
      error: `La clave debe tener entre 2 y ${MAX_KEY_LENGTH} caracteres.`,
    };
  }

  const value = String(input.value || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .trim()
    .replace(/\s+/g, " ");

  if (value.length < 2 || value.length > MAX_VALUE_LENGTH) {
    return {
      ok: false,
      error: `El valor debe tener entre 2 y ${MAX_VALUE_LENGTH} caracteres.`,
    };
  }

  const keyNormalized = normalizeMemoryKey(key);
  if (!keyNormalized) {
    return { ok: false, error: "La clave no contiene caracteres válidos." };
  }

  const sensitive = isSensitiveMemoryValue(value, key);
  if (sensitive.sensitive) {
    return {
      ok: false,
      error:
        `No se guardó el dato porque parece contener ${sensitive.reason}. ` +
        "La memoria solo conserva información útil de atención y nunca datos sensibles.",
    };
  }

  return { ok: true, category, key, keyNormalized, value };
}

async function logMemoryAction(
  action: string,
  customerId: string,
  details: Record<string, unknown>,
  options: MemoryMutationOptions = {}
) {
  try {
    await prisma.activityLog.create({
      data: {
        action,
        entityName: "CustomerMemory",
        entityId: customerId,
        userId: options.actorUserId || null,
        provider: "customer_memory",
        channel: "system",
        status: "success",
        detailsJson: JSON.stringify(details),
      },
    });
  } catch {
    // La auditoría no debe impedir la operación principal.
  }
}

export async function upsertCustomerMemoryFact(
  customerId: string,
  input: MemoryFactInput,
  options: MemoryMutationOptions = {}
) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, memoryOptOut: true },
    });

    if (!customer) {
      return { error: "Cliente no encontrado." };
    }

    if (customer.memoryOptOut && !options.ignoreOptOut) {
      return {
        error:
          "La memoria persistente está desactivada para este cliente. " +
          "Un administrador debe activarla desde el CRM antes de guardar nuevos datos.",
      };
    }

    const validation = validateMemoryInput(input);
    if (!validation.ok) {
      return { error: validation.error };
    }

    const existing = await prisma.customerMemoryFact.findUnique({
      where: {
        customerId_category_keyNormalized: {
          customerId,
          category: validation.category,
          keyNormalized: validation.keyNormalized,
        },
      },
    });

    if (!existing) {
      const count = await prisma.customerMemoryFact.count({ where: { customerId } });
      if (count >= MAX_FACTS_PER_CUSTOMER) {
        return {
          error:
            `Este cliente alcanzó el límite de ${MAX_FACTS_PER_CUSTOMER} datos de memoria. ` +
            "Edita o elimina algún dato desde el CRM antes de guardar uno nuevo.",
        };
      }
    }

    const fact = existing
      ? await prisma.customerMemoryFact.update({
          where: { id: existing.id },
          data: {
            key: validation.key,
            value: validation.value,
            source: options.source || existing.source,
            createdBy: options.actorUserId || existing.createdBy,
          },
        })
      : await prisma.customerMemoryFact.create({
          data: {
            customerId,
            category: validation.category,
            key: validation.key,
            keyNormalized: validation.keyNormalized,
            value: validation.value,
            source: options.source || "AI_WHATSAPP",
            createdBy: options.actorUserId || null,
          },
        });

    await logMemoryAction(
      existing ? "MEMORY_FACT_UPDATED" : "MEMORY_FACT_CREATED",
      customerId,
      {
        factId: fact.id,
        category: fact.category,
        key: fact.key,
        source: fact.source,
      },
      options
    );

    return {
      exitoso: true,
      actualizado: Boolean(existing),
      fact,
      mensaje: existing
        ? "Dato de memoria actualizado."
        : "Dato de memoria guardado.",
    };
  } catch (error: any) {
    // Carrera entre dos escrituras con la misma clave: actualizar la existente.
    if (error?.code === "P2002") {
      try {
        const validation = validateMemoryInput(input);
        if (validation.ok) {
          const fact = await prisma.customerMemoryFact.update({
            where: {
              customerId_category_keyNormalized: {
                customerId,
                category: validation.category,
                keyNormalized: validation.keyNormalized,
              },
            },
            data: {
              key: validation.key,
              value: validation.value,
              source: options.source || "AI_WHATSAPP",
            },
          });
          return { exitoso: true, actualizado: true, fact, mensaje: "Dato de memoria actualizado." };
        }
      } catch {
        // Continúa al error genérico.
      }
    }

    console.error("[CustomerMemory] Error al guardar memoria:", error);
    return { error: "No se pudo guardar el dato de memoria." };
  }
}

export async function updateCustomerMemoryFact(
  customerId: string,
  factId: string,
  input: Partial<MemoryFactInput>,
  options: MemoryMutationOptions = {}
) {
  try {
    const existing = await prisma.customerMemoryFact.findFirst({
      where: { id: factId, customerId },
    });

    if (!existing) {
      return { error: "Dato de memoria no encontrado para este cliente." };
    }

    const validation = validateMemoryInput({
      category: input.category ?? existing.category,
      key: input.key ?? existing.key,
      value: input.value ?? existing.value,
    });

    if (!validation.ok) {
      return { error: validation.error };
    }

    const conflict = await prisma.customerMemoryFact.findFirst({
      where: {
        customerId,
        category: validation.category,
        keyNormalized: validation.keyNormalized,
        NOT: { id: factId },
      },
    });

    if (conflict) {
      return {
        error: "Ya existe otro dato de memoria con esa categoría y clave. Edita el existente.",
      };
    }

    const fact = await prisma.customerMemoryFact.update({
      where: { id: factId },
      data: {
        category: validation.category,
        key: validation.key,
        keyNormalized: validation.keyNormalized,
        value: validation.value,
        source: options.source || existing.source,
        createdBy: options.actorUserId || existing.createdBy,
      },
    });

    await logMemoryAction(
      "MEMORY_FACT_UPDATED",
      customerId,
      { factId: fact.id, category: fact.category, key: fact.key },
      options
    );

    return { exitoso: true, fact };
  } catch (error: any) {
    console.error("[CustomerMemory] Error al actualizar memoria:", error);
    return { error: "No se pudo actualizar el dato de memoria." };
  }
}

export async function listCustomerMemoryFacts(customerId: string) {
  return prisma.customerMemoryFact.findMany({
    where: { customerId },
    orderBy: [{ updatedAt: "desc" }],
  });
}

export async function deleteCustomerMemoryFact(
  customerId: string,
  factId: string,
  options: MemoryMutationOptions = {}
) {
  try {
    const result = await prisma.customerMemoryFact.deleteMany({
      where: { id: factId, customerId },
    });

    if (result.count === 0) {
      return { error: "Dato de memoria no encontrado para este cliente." };
    }

    await logMemoryAction("MEMORY_FACT_DELETED", customerId, { factId }, options);
    return { exitoso: true, eliminados: result.count };
  } catch (error: any) {
    console.error("[CustomerMemory] Error al eliminar memoria:", error);
    return { error: "No se pudo eliminar el dato de memoria." };
  }
}

export async function clearCustomerMemory(
  customerId: string,
  options: MemoryMutationOptions = {}
) {
  try {
    const result = await prisma.customerMemoryFact.deleteMany({ where: { customerId } });
    await logMemoryAction("MEMORY_ALL_DELETED", customerId, { eliminados: result.count }, options);
    return { exitoso: true, eliminados: result.count };
  } catch (error: any) {
    console.error("[CustomerMemory] Error al borrar memoria:", error);
    return { error: "No se pudo borrar la memoria del cliente." };
  }
}

export async function setCustomerMemoryOptOut(
  customerId: string,
  optOut: boolean,
  options: MemoryMutationOptions = {}
) {
  try {
    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: { memoryOptOut: Boolean(optOut) },
      select: { id: true, memoryOptOut: true },
    });

    await logMemoryAction(
      optOut ? "MEMORY_DISABLED" : "MEMORY_ENABLED",
      customerId,
      { memoryOptOut: customer.memoryOptOut },
      options
    );

    return { exitoso: true, customer };
  } catch (error: any) {
    console.error("[CustomerMemory] Error al cambiar opt-out:", error);
    return { error: "No se pudo cambiar el estado de la memoria." };
  }
}

export async function getCustomerMemorySnapshot(customerId: string) {
  const [customer, facts, summaries] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        phone: true,
        defaultAddress: true,
        referencePoint: true,
        memoryOptOut: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.customerMemoryFact.findMany({
      where: { customerId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.conversationSummary.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      include: {
        conversation: {
          select: { id: true, channel: true, createdAt: true, lastMessageAt: true },
        },
      },
    }),
  ]);

  return { customer, facts, summaries };
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "fecha desconocida";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "fecha desconocida";
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function truncate(text: string, max: number): string {
  const clean = String(text || "").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/**
 * Construye el bloque de memoria que se inyecta al prompt del asistente.
 * Se ejecuta siempre en el servidor con el customerId de la conversación;
 * el modelo nunca puede elegir de qué cliente leer.
 */
export async function buildCustomerMemoryPrompt(customerId: string): Promise<string> {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        defaultAddress: true,
        referencePoint: true,
        memoryOptOut: true,
      },
    });

    if (!customer) return "";

    if (customer.memoryOptOut) {
      return (
        "=== MEMORIA PERSISTENTE DEL CLIENTE ===\n" +
        "La memoria está DESACTIVADA para este cliente. No uses datos de conversaciones anteriores " +
        "ni guardes nuevos datos de memoria. Atiende únicamente la conversación actual."
      );
    }

    const [facts, summaries] = await Promise.all([
      prisma.customerMemoryFact.findMany({
        where: { customerId },
        orderBy: { updatedAt: "desc" },
        take: MAX_PROMPT_FACTS,
      }),
      prisma.conversationSummary.findMany({
        where: { customerId },
        orderBy: { createdAt: "desc" },
        take: MAX_PROMPT_SUMMARIES,
      }),
    ]);

    const baseline: string[] = [];
    if (customer.name && !customer.name.startsWith("Cliente WhatsApp")) {
      baseline.push(`• Nombre registrado: ${customer.name}`);
    }
    if (customer.defaultAddress) {
      baseline.push(`• Dirección registrada: ${customer.defaultAddress}`);
    }
    if (customer.referencePoint) {
      baseline.push(`• Referencia registrada: ${customer.referencePoint}`);
    }

    if (baseline.length === 0 && facts.length === 0 && summaries.length === 0) {
      return "";
    }

    const factsByCategory = new Map<string, typeof facts>();
    for (const fact of facts) {
      const list = factsByCategory.get(fact.category) || [];
      list.push(fact);
      factsByCategory.set(fact.category, list);
    }

    const factLines: string[] = [];
    for (const category of MEMORY_CATEGORIES) {
      const list = factsByCategory.get(category) || [];
      for (const fact of list) {
        factLines.push(
          `• [${MEMORY_CATEGORY_LABELS[category]}] ${fact.key}: ${truncate(fact.value, 300)}`
        );
      }
    }

    const summaryLines = summaries.map(
      (summary) =>
        `• ${formatDate(summary.periodStart || summary.createdAt)} (${summary.messageCount} mensajes): ` +
        truncate(redactSensitiveText(summary.summaryText), MAX_PROMPT_SUMMARY_CHARS)
    );

    return (
      "=== MEMORIA PERSISTENTE DEL CLIENTE (USO INTERNO) ===\n" +
      (baseline.length > 0 ? `Datos base:\n${baseline.join("\n")}\n\n` : "") +
      (factLines.length > 0 ? `Datos guardados:\n${factLines.join("\n")}\n\n` : "") +
      (summaryLines.length > 0
        ? `Resúmenes de conversaciones anteriores:\n${summaryLines.join("\n")}\n\n`
        : "") +
      "REGLAS DE USO DE LA MEMORIA:\n" +
      "- Usa esta información solo para atender al cliente de esta conversación. No la mezcles con otros clientes.\n" +
      "- No reveles que existe un expediente ni enumeres todos los datos; úsala de forma natural.\n" +
      "- Si un dato parece desactualizado, confírmalo con el cliente antes de usarlo.\n" +
      "- Guarda solo datos duraderos y útiles con 'guardar_memoria_cliente'. No guardes datos sensibles.\n" +
      "- Si el cliente pide olvidar sus datos, indícale que un operador lo gestionará; no borres nada por tu cuenta."
    ).trim();
  } catch (error: any) {
    console.warn("[CustomerMemory] No se pudo construir el contexto de memoria:", error.message);
    return "";
  }
}
