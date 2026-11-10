import {
  ChatMessage,
  CompletionOptions,
  CompletionResult,
  ToolCallResult,
} from "./types";
import { ModelRouter } from "./model-router";
import { getAssistantConfig, AssistantIdentityConfig } from "./config-manager";
import { executeTool, getToolDefinitions } from "./tools";

export interface AgentChatInput {
  messages: ChatMessage[];
  config?: AssistantIdentityConfig;
  toolContext?: CompletionOptions["toolContext"];
  maxToolRounds?: number;
}

const OFFICIAL_ORDER_TOOLS = ["preparar_resumen_pedido", "registrar_pedido"];

function extractOfficialText(call: ToolCallResult): string | null {
  const result = call.result || {};
  return (
    result.resumenTexto ||
    result.mensajeConfirmacion ||
    result.mensajeOficial ||
    result.mensaje ||
    result.error ||
    null
  );
}

function buildToolResultsMessage(calls: ToolCallResult[]): string {
  const blocks = calls.map((call) => {
    let serialized = "";
    try {
      serialized = JSON.stringify(call.result);
    } catch {
      serialized = String(call.result);
    }
    if (serialized.length > 7000) {
      serialized = `${serialized.slice(0, 7000)}…`;
    }
    return `- ${call.tool}: ${serialized}`;
  });

  return (
    "[RESULTADOS OFICIALES DE LAS HERRAMIENTAS EJECUTADAS]\n" +
    blocks.join("\n") +
    "\n\nUsa exclusivamente estos resultados como fuente de verdad. " +
    "No inventes productos, precios, zonas, tarifas, números de pedido ni estados. " +
    "Si una herramienta devolvió un error, explícalo con amabilidad y ofrece la alternativa correcta. " +
    "Redacta ahora la respuesta final para el cliente, en español y con el tono configurado."
  );
}

function fallbackReply(calls: ToolCallResult[]): string {
  for (const call of calls) {
    const text = extractOfficialText(call);
    if (text) return String(text);
  }
  return "¡Gracias por escribir a TropiGO! ¿En qué puedo ayudarte hoy?";
}

/**
 * Ejecuta una conversación completa con el motor de IA:
 * 1. Llama al modelo con el catálogo de herramientas.
 * 2. Ejecuta las herramientas que el modelo solicite.
 * 3. Devuelve los resultados al modelo para que redacte la respuesta final.
 * 4. Repite hasta agotar las rondas o hasta que ya no haya herramientas nuevas.
 *
 * Es el punto único de entrada para WhatsApp (Meta/Baileys), Webchat y CRM.
 */
export async function runAgentChat(input: AgentChatInput): Promise<CompletionResult> {
  const config = input.config || (await getAssistantConfig());
  const messages: ChatMessage[] = [...input.messages];
  const toolDefinitions = getToolDefinitions();
  const allToolCalls: ToolCallResult[] = [];
  const executedKeys = new Set<string>();
  const maxRounds = Math.max(1, Math.min(input.maxToolRounds ?? 3, 5));

  let lastResult: CompletionResult | null = null;

  for (let round = 0; round < maxRounds; round++) {
    const result = await ModelRouter.executeChat(
      messages,
      {
        tools: toolDefinitions,
        toolChoice: "auto",
        toolContext: input.toolContext,
      },
      config
    );

    lastResult = result;

    const requestedCalls = result.toolCalls || [];
    if (requestedCalls.length === 0) {
      return {
        ...result,
        toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
        operatorHandoff:
          result.operatorHandoff ||
          allToolCalls.some((call) => call.tool === "pasar_a_humano"),
      };
    }

    const newCalls: ToolCallResult[] = [];

    for (const call of requestedCalls) {
      let key = call.tool;
      try {
        key += `:${JSON.stringify(call.args || {})}`;
      } catch {
        key += `:${String(call.args)}`;
      }

      // Evita repetir exactamente la misma herramienta con los mismos argumentos.
      if (executedKeys.has(key)) continue;
      executedKeys.add(key);

      const toolResult = await executeTool(call.tool, call.args, input.toolContext);
      const executed: ToolCallResult = {
        tool: call.tool,
        args: call.args,
        result: toolResult,
      };
      newCalls.push(executed);
      allToolCalls.push(executed);
    }

    if (newCalls.length === 0) {
      // El modelo insistió con herramientas ya ejecutadas. No hay nada nuevo
      // que consultar: se responde con el resultado oficial ya obtenido.
      break;
    }

    // Se añade la respuesta del modelo (si tuvo texto) y los resultados como
    // un turno de usuario sintético. Funciona igual en Gemini, Groq y OpenRouter.
    messages.push({
      role: "assistant",
      content: result.content?.trim() || "Consultando el sistema oficial de TropiGO…",
    });
    messages.push({
      role: "user",
      content: buildToolResultsMessage(newCalls),
    });
  }

  const base =
    lastResult ||
    ({
      content: "",
      provider: "simulator",
      model: "local-ivirgarzama-v1",
      latencyMs: 0,
      fallbackUsed: true,
    } as CompletionResult);

  let content = base.content?.trim() || "";

  // Para pedidos, el texto oficial de la herramienta (resumen/cotización) es
  // la única fuente de verdad y debe llegar íntegro al cliente.
  const officialCall = [...allToolCalls]
    .reverse()
    .find((call) => OFFICIAL_ORDER_TOOLS.includes(call.tool));
  if (officialCall) {
    const officialText = extractOfficialText(officialCall);
    if (officialText) content = String(officialText);
  }

  if (!content) {
    content = fallbackReply(allToolCalls);
  }

  return {
    ...base,
    content,
    toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
    operatorHandoff: allToolCalls.some((call) => call.tool === "pasar_a_humano"),
  };
}
