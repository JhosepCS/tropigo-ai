import { NextRequest, NextResponse } from "next/server";
import { runAgentChat } from "@/lib/ai/agent";
import { ChatMessage } from "@/lib/ai/types";
import { getAssistantConfig, buildSystemPrompt } from "@/lib/ai/config-manager";
import { getRealDataContextPrompt, executeTool } from "@/lib/ai/tools";
import { requireAuth, UnauthorizedError } from "@/lib/auth/rbac";

export async function POST(req: NextRequest) {
  try {
    // El simulador del CRM solo puede usarlo personal autenticado.
    const session = await requireAuth();
    const body = await req.json();
    const { messages, draftConfig } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Se requiere un array de 'messages' para el asistente." },
        { status: 400 }
      );
    }

    // 1. Obtener configuración activa de Supabase (o combinar con borrador para simulación previa)
    const activeConfig = await getAssistantConfig();
    const effectiveConfig = draftConfig ? { ...activeConfig, ...draftConfig } : activeConfig;

    // 2. Construir el prompt de sistema oficial personalizado desde la base de datos con datos reales
    const realDataContext = await getRealDataContextPrompt();
    const dynamicSystemPrompt = buildSystemPrompt(effectiveConfig, realDataContext);

    const formattedMessages: ChatMessage[] = [];

    // Siempre inyectar el System Prompt actualizado al inicio
    formattedMessages.push({
      role: "system",
      content: dynamicSystemPrompt,
    });

    for (const m of messages) {
      if (m.role !== "system") {
        formattedMessages.push({
          role: m.role === "assistant" ? "assistant" : "user",
          content: String(m.content || ""),
        });
      }
    }

    // Contexto de herramientas construido por el servidor. No se aceptan
    // tools ni toolContext enviados por el cliente.
    const toolContext = {
      source: "CRM" as const,
      actorUserId: session.userId,
      actorRole: session.role,
      confirmationVerified: false,
    };

    // Ejecutar el mismo orquestador que usan WhatsApp y Webchat: permite
    // varias rondas de herramientas y garantiza una respuesta final con texto.
    const result = await runAgentChat({
      messages: formattedMessages,
      config: effectiveConfig,
      toolContext,
    });

    // Resolver tool calls si no tienen resultado
    if (result.toolCalls && result.toolCalls.length > 0) {
      for (const call of result.toolCalls) {
        if (!call.result) {
          call.result = await executeTool(call.tool, call.args, toolContext);
        }
      }
    }

    // Nunca devolver una burbuja vacía al simulador.
    if (!result.content || !result.content.trim()) {
      result.content =
        "No pude generar una respuesta en este momento. Intenta de nuevo o revisa la configuración del proveedor de IA.";
    }

    return NextResponse.json({
      success: true,
      result,
      assistantInfo: {
        name: effectiveConfig.name,
        avatarUrl: effectiveConfig.avatarUrl,
        tone: effectiveConfig.tone,
        activeProvider: effectiveConfig.activeProvider,
        activeModel: effectiveConfig.activeModel,
      },
    });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Error en /api/assistant/chat:", error);
    return NextResponse.json(
      { error: error.message || "Error al procesar mensaje con el asistente." },
      { status: 500 }
    );
  }
}
