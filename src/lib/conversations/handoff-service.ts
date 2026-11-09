import { prisma } from "../prisma";

export type ConversationStatus = "AI_ACTIVE" | "HUMAN_TAKEOVER" | "PAUSED" | "CLOSED";

export interface HandoffOptions {
  operatorUserId?: string;
  reason?: string;
  actorUserId: string;
}

export class HandoffService {
  /**
   * Toma el control manual de una conversación.
   * Silencia la IA inmediatamente.
   */
  static async takeControl(conversationId: string, options: HandoffOptions) {
    return prisma.$transaction(async (tx) => {
      const conv = await tx.conversation.update({
        where: { id: conversationId },
        data: {
          status: "HUMAN_TAKEOVER",
          assignedOperatorId: options.operatorUserId,
          lastMessageAt: new Date(),
        },
      });

      await tx.activityLog.create({
        data: {
          action: "HUMAN_TAKEOVER",
          entityName: "Conversation",
          entityId: conversationId,
          userId: options.actorUserId,
          provider: "crm",
          channel: "system",
          status: "success",
          detailsJson: JSON.stringify({
            operatorId: options.operatorUserId,
            reason: options.reason || "Toma de control manual",
          }),
        },
      });

      return conv;
    });
  }

  /**
   * Devuelve el control al asistente de IA.
   */
  static async returnToAI(conversationId: string, actorUserId: string) {
    return prisma.$transaction(async (tx) => {
      const conv = await tx.conversation.update({
        where: { id: conversationId },
        data: {
          status: "AI_ACTIVE",
          assignedOperatorId: null,
          lastMessageAt: new Date(),
        },
      });

      await tx.activityLog.create({
        data: {
          action: "RETURN_TO_AI",
          entityName: "Conversation",
          entityId: conversationId,
          userId: actorUserId,
          provider: "crm",
          channel: "system",
          status: "success",
          detailsJson: JSON.stringify({
            previousOperatorId: conv.assignedOperatorId,
            reason: "Control devuelto al asistente",
          }),
        },
      });

      return conv;
    });
  }

  /**
   * Pausa la IA sin asignar necesariamente un operador.
   * Útil para revisiones rápidas sin "adueñarse" de la charla.
 l*/
  static async pauseAI(conversationId: string, actorUserId: string) {
    return prisma.$transaction(async (tx) => {
      const conv = await tx.conversation.update({
        where: { id: conversationId },
        data: {
          status: "PAUSED",
          lastMessageAt: new Date(),
        },
      });

      await tx.activityLog.create({
        data: {
          action: "AI_PAUSED",
          entityName: "Conversation",
          entityId: conversationId,
          userId: actorUserId,
          provider: "crm",
          channel: "system",
          status: "success",
          detailsJson: JSON.stringify({ reason: "Pausa temporal de la IA" }),
        },
      });

      return conv;
    });
  }

  /**
   * Asigna una conversación a un operador específico.
   */
  static async assignOperator(conversationId: string, operatorUserId: string, actorUserId: string) {
    return prisma.$transaction(async (tx) => {
      const conv = await tx.conversation.update({
        where: { id: conversationId },
        data: {
          assignedOperatorId: operatorUserId,
          status: "HUMAN_TAKEOVER", // Al asignar, asumimos que el humano toma el control
        },
      });

      await tx.activityLog.create({
        data: {
          action: "OPERATOR_ASSIGNED",
          entityName: "Conversation",
          entityId: conversationId,
          userId: actorUserId,
          provider: "crm",
          channel: "system",
          status: "success",
          detailsJson: JSON.stringify({ operatorId: operatorUserId }),
        },
      });

      return conv;
    });
  }
}
