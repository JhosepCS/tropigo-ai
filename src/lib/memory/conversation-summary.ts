import { Conversation } from "@prisma/client";
import { prisma } from "../prisma";
import { redactSensitiveText } from "./customer-memory";

// =================================================================
// RESÚMENES HISTÓRICOS Y SESIONES DE CONVERSACIÓN
// =================================================================

const SESSION_GAP_DAYS = Math.max(
  1,
  Number(process.env.MEMORY_SESSION_GAP_DAYS || 3)
);
const MAX_MESSAGES_FOR_SUMMARY = 500;

export interface SummaryGenerationOptions {
  generatedBy?: "SYSTEM" | "CRM";
  force?: boolean;
  actorUserId?: string | null;
}

interface SummaryMessage {
  sender: string;
  content: string;
  createdAt: Date;
}

interface DeterministicSummary {
  summaryText: string;
  topics: string[];
  messageCount: number;
  periodStart: Date | null;
  periodEnd: Date | null;
}

const TOPIC_RULES: Array<{ label: string; patterns: RegExp[] }> = [
  {
    label: "pedido de comida/delivery",
    patterns: [/pedido/i, /delivery/i, /comida/i, /pollo/i, /almuerzo/i, /cena/i, /plato/i],
  },
  {
    label: "mototaxi/traslado",
    patterns: [/mototaxi/i, /carrera/i, /torito/i, /viaje/i, /traslado/i],
  },
  {
    label: "dirección/entrega",
    patterns: [
      /dirección/i,
      /direccion/i,
      /barrio/i,
      /zona/i,
      /calle/i,
      /avenida/i,
      /\bav\.?\b/i,
      /referencia/i,
      /esquina/i,
    ],
  },
  {
    label: "pago",
    patterns: [/pago/i, /\bqr\b/i, /efectivo/i, /transferencia/i, /\bbs\.?\b/i],
  },
  {
    label: "reclamo/incidencia",
    patterns: [
      /reclamo/i,
      /queja/i,
      /demora/i,
      /problema/i,
      /no llegó/i,
      /no llego/i,
      /cancelar/i,
    ],
  },
  {
    label: "horarios/disponibilidad",
    patterns: [/horario/i, /abierto/i, /cerrado/i, /disponible/i],
  },
  {
    label: "farmacia/mandado",
    patterns: [/farmacia/i, /medicamento/i, /mandado/i, /compra/i],
  },
];

const ADDRESS_KEYWORDS =
  /dirección|direccion|barrio|zona|calle|avenida|\bav\.?\b|pasaje|esquina|referencia|frente a|cerca de|entre calles|manzano|uv\.?/i;

const PREFERENCE_KEYWORDS =
  /prefiero|preferiría|preferiria|me gusta|no me gusta|siempre|sin\s|con\s|alergia|solo\s|extra|bien cocido|poco picante|sin picante|sin cebolla|sin tomate/i;

const ISSUE_KEYWORDS =
  /reclamo|queja|demora|problema|no llegó|no llego|pendiente|cancelar|devolución|devolucion|error/i;

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "fecha desconocida";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "fecha desconocida";
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function cleanSnippet(text: string, max = 180): string {
  const clean = redactSensitiveText(text).replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function uniqueSnippets(
  messages: SummaryMessage[],
  keywordPattern: RegExp,
  max: number
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const message of messages) {
    if (message.sender.toUpperCase() !== "CUSTOMER") continue;
    if (message.content.length < 10 || !keywordPattern.test(message.content)) continue;

    const snippet = cleanSnippet(message.content);
    const key = snippet.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(snippet);

    if (result.length >= max) break;
  }

  return result;
}

export function buildDeterministicSummary(messages: SummaryMessage[]): DeterministicSummary {
  const total = messages.length;
  const customerMessages = messages.filter(
    (message) => message.sender.toUpperCase() === "CUSTOMER"
  );
  const allText = messages.map((message) => message.content).join("\n");

  const topics = TOPIC_RULES.filter((rule) =>
    rule.patterns.some((pattern) => pattern.test(allText))
  ).map((rule) => rule.label);

  const orderNumbers = Array.from(
    new Set((allText.match(/\bTRP-\d{3,}\b/gi) || []).map((value) => value.toUpperCase()))
  ).slice(0, 8);

  const addresses = uniqueSnippets(customerMessages, ADDRESS_KEYWORDS, 3);
  const preferences = uniqueSnippets(customerMessages, PREFERENCE_KEYWORDS, 5);
  const issues = uniqueSnippets(customerMessages, ISSUE_KEYWORDS, 3);

  const periodStart = messages[0]?.createdAt || null;
  const periodEnd = messages[messages.length - 1]?.createdAt || null;

  const lines: string[] = [
    `Conversación del ${formatDate(periodStart)} al ${formatDate(periodEnd)} ` +
      `(${total} mensajes; ${customerMessages.length} del cliente).`,
  ];

  if (topics.length > 0) {
    lines.push(`Temas: ${topics.join(", ")}.`);
  }
  if (orderNumbers.length > 0) {
    lines.push(`Pedidos mencionados: ${orderNumbers.join(", ")}.`);
  }
  if (preferences.length > 0) {
    lines.push(`Preferencias/datos útiles: ${preferences.map((p) => `"${p}"`).join("; ")}.`);
  }
  if (addresses.length > 0) {
    lines.push(`Direcciones/referencias: ${addresses.map((a) => `"${a}"`).join("; ")}.`);
  }
  if (issues.length > 0) {
    lines.push(`Pendientes/incidencias: ${issues.map((i) => `"${i}"`).join("; ")}.`);
  }

  if (lines.length === 1) {
    lines.push("Conversación breve sin datos duraderos relevantes.");
  }

  return {
    summaryText: lines.join("\n").slice(0, 1800),
    topics,
    messageCount: total,
    periodStart,
    periodEnd,
  };
}

async function logSummaryAction(
  action: string,
  summaryId: string,
  customerId: string,
  details: Record<string, unknown>,
  actorUserId?: string | null
) {
  try {
    await prisma.activityLog.create({
      data: {
        action,
        entityName: "ConversationSummary",
        entityId: summaryId,
        userId: actorUserId || null,
        provider: "customer_memory",
        channel: "system",
        status: "success",
        detailsJson: JSON.stringify({ customerId, ...details }),
      },
    });
  } catch {
    // La auditoría no debe bloquear el resumen.
  }
}

export async function summarizeConversation(
  conversationId: string,
  options: SummaryGenerationOptions = {}
) {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        summary: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: MAX_MESSAGES_FOR_SUMMARY,
        },
      },
    });

    if (!conversation) {
      return { error: "Conversación no encontrada." };
    }

    if (conversation.summary && !options.force) {
      return { exitoso: true, existente: true, summary: conversation.summary };
    }

    if (conversation.messages.length === 0) {
      return { error: "La conversación no tiene mensajes para resumir." };
    }

    const orderedMessages = [...conversation.messages].reverse().map((message) => ({
      sender: message.sender,
      content: message.content,
      createdAt: message.createdAt,
    }));

    const deterministic = buildDeterministicSummary(orderedMessages);

    const summary = await prisma.conversationSummary.upsert({
      where: { conversationId },
      create: {
        customerId: conversation.customerId,
        conversationId,
        summaryText: deterministic.summaryText,
        topicsJson: JSON.stringify(deterministic.topics),
        messageCount: deterministic.messageCount,
        periodStart: deterministic.periodStart,
        periodEnd: deterministic.periodEnd,
        generatedBy: options.generatedBy || "SYSTEM",
      },
      update: {
        summaryText: deterministic.summaryText,
        topicsJson: JSON.stringify(deterministic.topics),
        messageCount: deterministic.messageCount,
        periodStart: deterministic.periodStart,
        periodEnd: deterministic.periodEnd,
        generatedBy: options.generatedBy || "SYSTEM",
      },
    });

    await logSummaryAction(
      conversation.summary ? "SUMMARY_REGENERATED" : "SUMMARY_CREATED",
      summary.id,
      conversation.customerId,
      {
        conversationId,
        messageCount: summary.messageCount,
        generatedBy: summary.generatedBy,
      },
      options.actorUserId
    );

    return { exitoso: true, existente: false, summary };
  } catch (error: any) {
    console.error("[ConversationSummary] Error al resumir conversación:", error);
    return { error: "No se pudo generar el resumen de la conversación." };
  }
}

export async function listConversationSummaries(customerId: string) {
  return prisma.conversationSummary.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    include: {
      conversation: {
        select: { id: true, channel: true, status: true, createdAt: true, lastMessageAt: true },
      },
    },
  });
}

export async function deleteConversationSummary(
  customerId: string,
  summaryId: string,
  options: SummaryGenerationOptions = {}
) {
  try {
    const result = await prisma.conversationSummary.deleteMany({
      where: { id: summaryId, customerId },
    });

    if (result.count === 0) {
      return { error: "Resumen no encontrado para este cliente." };
    }

    await logSummaryAction("SUMMARY_DELETED", summaryId, customerId, {}, options.actorUserId);
    return { exitoso: true, eliminados: result.count };
  } catch (error: any) {
    console.error("[ConversationSummary] Error al eliminar resumen:", error);
    return { error: "No se pudo eliminar el resumen." };
  }
}

export async function clearCustomerSummaries(
  customerId: string,
  options: SummaryGenerationOptions = {}
) {
  try {
    const result = await prisma.conversationSummary.deleteMany({ where: { customerId } });
    await logSummaryAction(
      "SUMMARY_ALL_DELETED",
      customerId,
      customerId,
      { eliminados: result.count },
      options.actorUserId
    );
    return { exitoso: true, eliminados: result.count };
  } catch (error: any) {
    console.error("[ConversationSummary] Error al borrar resúmenes:", error);
    return { error: "No se pudieron borrar los resúmenes del cliente." };
  }
}

// -----------------------------------------------------------------
// Rotación de sesión: al volver después de varios días se cierra la
// conversación anterior, se resume y se abre una nueva. Así el contexto
// reciente no se mezcla con conversaciones antiguas, pero la memoria
// estructurada y los resúmenes sí permanecen disponibles.
// -----------------------------------------------------------------

const sessionLocks = new Map<string, Promise<Conversation>>();

async function ensureConversationSessionInternal(
  customerId: string,
  channel: string,
  sessionKey?: string | null
): Promise<Conversation> {
  const latest = await prisma.conversation.findFirst({
    where: {
      customerId,
      channel,
      ...(sessionKey ? { sessionKey } : {}),
    },
    orderBy: { lastMessageAt: "desc" },
  });

  if (!latest) {
    return prisma.conversation.create({
      data: {
        customerId,
        channel,
        status: "AI_ACTIVE",
        lastMessageAt: new Date(),
        ...(sessionKey ? { sessionKey } : {}),
      },
    });
  }

  // Una conversación tomada por un operador humano no se cierra sola.
  if (latest.status === "HUMAN_TAKEOVER") {
    return latest;
  }

  const gapMs = SESSION_GAP_DAYS * 24 * 60 * 60 * 1000;
  const isStale =
    latest.status === "CLOSED" ||
    latest.lastMessageAt.getTime() < Date.now() - gapMs;

  if (!isStale) {
    return latest;
  }

  const messageCount = await prisma.message.count({
    where: { conversationId: latest.id },
  });

  if (messageCount > 0) {
    // El resumen es determinístico y no depende de un modelo pago.
    await summarizeConversation(latest.id, { generatedBy: "SYSTEM" }).catch((error) => {
      console.warn(
        `[ConversationSummary] No se pudo resumir la conversación ${latest.id}:`,
        error?.message || error
      );
    });
  }

  if (latest.status !== "CLOSED") {
    await prisma.conversation.update({
      where: { id: latest.id },
      data: { status: "CLOSED" },
    });
  }

  const created = await prisma.conversation.create({
    data: {
      customerId,
      channel,
      status: "AI_ACTIVE",
      lastMessageAt: new Date(),
      ...(sessionKey ? { sessionKey } : {}),
    },
  });

  try {
    await prisma.activityLog.create({
      data: {
        action: "MEMORY_SESSION_ROLLOVER",
        entityName: "Conversation",
        entityId: created.id,
        provider: "customer_memory",
        channel: "system",
        status: "success",
        detailsJson: JSON.stringify({
          customerId,
          previousConversationId: latest.id,
          newConversationId: created.id,
          messageCount,
        }),
      },
    });
  } catch {
    // La auditoría no debe bloquear la conversación.
  }

  return created;
}

export function ensureConversationSession(
  customerId: string,
  channel: string,
  sessionKey?: string | null
): Promise<Conversation> {
  const key = `${customerId}:${channel}:${sessionKey || "default"}`;
  const previous = sessionLocks.get(key) || Promise.resolve<Conversation | undefined>(undefined);

  const current = previous
    .catch(() => undefined)
    .then(() => ensureConversationSessionInternal(customerId, channel, sessionKey));

  sessionLocks.set(key, current);
  current
    .finally(() => {
      if (sessionLocks.get(key) === current) {
        sessionLocks.delete(key);
      }
    })
    .catch(() => {});

  return current;
}
