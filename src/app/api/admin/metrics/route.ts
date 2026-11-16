import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
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

    // Latencia promedio en milisegundos por modelo
    const latencyStats = await prisma.message.groupBy({
      by: ["providerModel"],
      _avg: { latencyMs: true },
      where: {
        sender: "ASSISTANT",
        createdAt: { gte: since },
        latencyMs: { not: null },
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
      promedioLatenciaMs: latencyStats.map((l) => ({
        modelo: l.providerModel || "default",
        latenciaMs: Math.round(l._avg.latencyMs || 0),
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
    console.error("[Metrics API] Error:", error);
    return NextResponse.json(
      { error: "No se pudieron calcular las métricas", detalle: error?.message },
      { status: 500 }
    );
  }
}
