import { NextRequest, NextResponse } from "next/server";
import { runAgentChat } from "@/lib/ai/agent";
import { ChatMessage } from "@/lib/ai/types";
import { getAssistantConfig, buildSystemPrompt } from "@/lib/ai/config-manager";
import { getRealDataContextPrompt, executeTool } from "@/lib/ai/tools";
import { requireAuth, UnauthorizedError } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import {
  confirmAndCreateOrder,
  findOrCreateCustomerByPhone,
} from "@/lib/orders/order-service";
import { isSafeExplicitConfirmation } from "@/lib/orders/confirmation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Convierte errores de red en un mensaje entendible para el operador. */
function friendlyError(error: any): string {
  const raw = String(error?.message || error || "");
  if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|fetch failed|Unable to connect/i.test(raw)) {
    return (
      "No se pudo conectar con el proveedor de IA en este momento. " +
      "Revisa la conexión a internet y el proveedor configurado en AI Studio; " +
      "el pedido no se registró."
    );
  }
  return raw || "Error al procesar el mensaje con el asistente.";
}

export async function POST(req: NextRequest) {
  try {
    // El simulador del CRM solo puede usarlo personal autenticado.
    const session = await requireAuth();
    const body = await req.json();
    const { messages, draftConfig, safeMode } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Se requiere un array de 'messages' para el asistente." },
        { status: 400 }
      );
    }

    // El número del cliente es la identidad de la conversación. En el
    // simulador lo configura el operador; en WhatsApp llega desde Meta.
    const customerPhone = String(body.customerPhone || "").trim();
    const customerName = String(body.customerName || "").trim();
    const phoneDigits = customerPhone.replace(/\D/g, "");

    if (phoneDigits.length < 7) {
      return NextResponse.json(
        {
          error:
            "Configura un número de WhatsApp de prueba (mínimo 7 dígitos) para que la IA pueda cotizar y registrar pedidos como en WhatsApp.",
        },
        { status: 400 }
      );
    }

    const customer = await findOrCreateCustomerByPhone(
      customerPhone,
      customerName || null
    );

    if (!customer) {
      return NextResponse.json(
        { error: "No se pudo crear el cliente de prueba con ese número." },
        { status: 400 }
      );
    }

    // 1. Obtener configuración activa de Supabase (o combinar con borrador para simulación previa)
    const activeConfig = await getAssistantConfig();
    const effectiveConfig = draftConfig ? { ...activeConfig, ...draftConfig } : activeConfig;

    // 2. Construir el prompt de sistema oficial personalizado desde la base de datos con datos reales
    const realDataContext = await getRealDataContextPrompt();
    const simulatorContext =
      `[CANAL: SIMULADOR DEL CRM]\n` +
      `El cliente de prueba es *${customer.name || "Cliente"}* y su WhatsApp es ${customer.phone}.\n` +
      `Ese número ya es su identidad: NO le pidas registrarse en la web, crear una cuenta, iniciar sesión ` +
      `ni escribir desde otro número. Si falta el nombre, pídelo una sola vez y guárdalo con 'preparar_resumen_pedido' (nombreCliente).`;
    const dynamicSystemPrompt = buildSystemPrompt(
      effectiveConfig,
      [realDataContext, simulatorContext].filter(Boolean).join("\n\n")
    );

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
      customerId: customer.id,
      confirmationVerified: false,
      operatorConfirmed: false,
      source: "CRM" as const,
      actorUserId: session.userId,
      actorRole: session.role,
    };

    // -----------------------------------------------------------------
    // Confirmación explícita: igual que en WhatsApp, el servidor (no el
    // modelo) detecta la confirmación y registra el pedido pendiente.
    // -----------------------------------------------------------------
    const lastUserText = [...formattedMessages]
      .reverse()
      .find((m) => m.role === "user")?.content;

    if (!safeMode && lastUserText && isSafeExplicitConfirmation(lastUserText)) {
      const pendingQuote = await prisma.orderQuote.findFirst({
        where: {
          customerId: customer.id,
          status: "PENDIENTE",
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });

      if (pendingQuote) {
        const creation = await confirmAndCreateOrder(
          { quoteId: pendingQuote.id },
          {
            customerId: customer.id,
            confirmationVerified: true,
            source: "CRM",
            actorUserId: session.userId,
            actorRole: session.role,
          }
        );

        const content = creation.exitoso
          ? creation.mensajeConfirmacion ||
            `Tu pedido ${creation.orderNumber} fue registrado correctamente.`
          : `No pude registrar el pedido: ${
              creation.error || "intenta nuevamente o solicita ayuda a un operador."
            }`;

        return NextResponse.json({
          success: true,
          result: {
            content,
            provider: "server",
            model: "confirmacion-segura",
            latencyMs: 0,
            toolCalls: [
              {
                tool: "registrar_pedido",
                args: { quoteId: pendingQuote.id },
                result: creation,
              },
            ],
          },
          assistantInfo: {
            name: effectiveConfig.name,
            avatarUrl: effectiveConfig.avatarUrl,
            tone: effectiveConfig.tone,
            activeProvider: effectiveConfig.activeProvider,
            activeModel: effectiveConfig.activeModel,
          },
          customer: { id: customer.id, name: customer.name, phone: customer.phone },
        });
      }
    }

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
      customer: { id: customer.id, name: customer.name, phone: customer.phone },
    });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Error en /api/assistant/chat:", error);
    return NextResponse.json(
      { error: friendlyError(error) },
      { status: 500 }
    );
  }
}
