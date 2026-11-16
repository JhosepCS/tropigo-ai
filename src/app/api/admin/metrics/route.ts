import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireRole,
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["SUPERADMIN", "ADMIN", "OPERATOR"]);

    const since = new Date();
    since.setDate(since.getDate() - 7); // Últimos 7 días

    // Total de mensajes por emisor (CUSTOMER, ASSISTANT, OPERATOR)
    const messagesBySender = await prisma.message.groupBy({
      by: ["sender"],
      _count: true,
      where: { createdAt: { gte: since } },
    });

    // Mensajes procesados por cada modelo/proveedor de IA
    const messagesByModel = await prisma.message.groupBy({
      by: ["providerModel"],
      _count: true,
      where: {
        sender: "ASSISTANT",
        createdAt: { gte: since },
      },
    });

    // Latencia promedio y consumo de tokens por modelo
    const modelStats = await prisma.message.groupBy({
      by: ["providerModel"],
      _count: true,
      _avg: { latencyMs: true },
      _sum: { tokensUsed: true },
      where: {
        sender: "ASSISTANT",
        createdAt: { gte: since },
      },
      orderBy: { _sum: { tokensUsed: "desc" } },
    });

    // Consumo total de tokens de los últimos 7 días
    const tokenTotals = await prisma.message.aggregate({
      _sum: { tokensUsed: true },
      _count: true,
      where: {
        sender: "ASSISTANT",
        createdAt: { gte: since },
        tokensUsed: { not: null },
      },
    });

    // Herramientas más ejecutadas (ActivityLog)
    const topTools = await prisma.activityLog.groupBy({
      by: ["action"],
      _count: true,
      where: {
        action: { startsWith: "TOOL_" },
        createdAt: { gte: since },
      },
      orderBy: { _count: { action: "desc" } },
      take: 8,
    });

    // Total de conversaciones y derivaciones a humanos
    const totalConversations = await prisma.conversation.count({
      where: { createdAt: { gte: since } },
    });

    const handoffsCount = await prisma.handoffHistory.count({
      where: { createdAt: { gte: since } },
    });

    // Calificaciones promedio post-entrega (OrderRating)
    const ratingsSummary = await prisma.orderRating.aggregate({
      _avg: { rating: true },
      _count: { rating: true },
      where: { createdAt: { gte: since } },
    });

    const totalTokens = tokenTotals._sum.tokensUsed || 0;
    const assistantMessages = messagesBySender.find(
      (m) => m.sender === "ASSISTANT"
    )?._count || 0;

    return NextResponse.json({
      period: "Últimos 7 días",
      totalConversations,
      handoffsCount,
      aiResolutionRate:
        totalConversations > 0
          ? `${(((totalConversations - handoffsCount) / totalConversations) * 100).toFixed(1)}%`
          : "100%",
      messagesBySender: messagesBySender.map((m) => ({
        emisor: m.sender,
        cantidad: m._count,
      })),
      messagesByModel: messagesByModel.map((m) => ({
        modelo: m.providerModel || "gemini-3.1-flash-lite (default)",
        cantidad: m._count,
      })),
      tokensTotal: totalTokens,
      promedioTokensPorMensaje:
        assistantMessages > 0 ? Math.round(totalTokens / assistantMessages) : 0,
      tokensByModel: modelStats
        .filter((m) => (m._sum.tokensUsed || 0) > 0)
        .map((m) => ({
          modelo: m.providerModel || "default",
          tokens: m._sum.tokensUsed || 0,
          mensajes: m._count,
        })),
      promedioLatenciaMs: modelStats.map((m) => ({
        modelo: m.providerModel || "default",
        latenciaMs: Math.round(m._avg.latencyMs || 0),
        mensajes: m._count,
        tokens: m._sum.tokensUsed || 0,
      })),
      herramientasMasUsadas: topTools.map((t) => ({
        herramienta: t.action.replace("TOOL_", "").toLowerCase(),
        ejecuciones: t._count,
      })),
      satisfaccionClientes: {
        promedioEstrellas: (ratingsSummary._avg.rating || 5).toFixed(1),
        totalCalificaciones: ratingsSummary._count.rating || 0,
      },
    });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[Metrics API] Error:", error);
    return NextResponse.json(
      { error: "No se pudieron calcular las métricas", detalle: error?.message },
      { status: 500 }
    );
  }
}
