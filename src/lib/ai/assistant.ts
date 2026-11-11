import { prisma } from "../prisma";
import { executeTool, getToolDefinitions, TROPIGO_TOOLS } from "./tools";
import { OrderToolContext } from "../orders/order-service";
import { calculateRideFare, getRideFareConfig } from "../rides/fare";

export interface ToolCallExecution {
  tool: string;
  args: any;
  result: any;
}

export interface AssistantResponse {
  content: string;
  toolCalls: ToolCallExecution[];
}

/**
 * Catálogo oficial de herramientas de TropiBot (Delivery & Movilidad Ivirgarzama)
 */
export const TROPIGO_ASSISTANT_TOOLS = getToolDefinitions();

/**
 * Ejecutor de Herramientas de TropiGO
 */
export async function executeToolCall(
  name: string,
  args: any,
  safeMode = false,
  context?: OrderToolContext
): Promise<any> {
  // 1. Si es una de las herramientas internas modulares conectadas a la base de datos
  const isModularTool = TROPIGO_TOOLS.some((t) => t.name === name);
  if (isModularTool) {
    return executeTool(name, args, context);
  }

  const logActivity = async (action: string, provider: string, status: string, details: any) => {
    try {
      await prisma.activityLog.create({
        data: {
          action,
          provider,
          channel: "whatsapp",
          status,
          detailsJson: JSON.stringify(details),
        },
      });
    } catch (e) {}
  };

  switch (name) {
    case "consultar_catalogo": {
      const merchants = await prisma.merchant.findMany({
        where: { isOpen: true },
        include: { products: { where: { isAvailable: true } } },
      });

      await logActivity("Consulta de catálogo TropiGO", "assistant_groq", "success", args);

      return {
        comercios: merchants.map((m) => ({
          nombre: m.name,
          categoria: m.category,
          menu: m.products.map((p) => ({
            plato: p.name,
            precioBs: p.price,
            descripcion: p.description,
          })),
        })),
      };
    }

    case "cotizar_tarifa": {
      const zones = await prisma.deliveryZone.findMany({ where: { isActive: true } });
      const matchedZone = zones.find((z) =>
        args.destino?.toLowerCase().includes(z.name.toLowerCase())
      );

      const fareConfig = await getRideFareConfig();
      const tarifa =
        args.tipo === "MOTOTAXI"
          ? calculateRideFare({
              zoneFare: matchedZone?.baseRideCost,
              vehicleType: args.vehiculo,
              config: fareConfig,
            }).fare
          : matchedZone?.baseDeliveryCost || 5.0;

      await logActivity("Cotización de tarifa", "assistant_groq", "success", {
        destino: args.destino,
        tipo: args.tipo,
        tarifaBs: tarifa,
      });

      return {
        zona: matchedZone?.name || "Radio Urbano Ivirgarzama",
        tipo: args.tipo,
        tarifaBs: tarifa,
        mensaje: `La tarifa para ${args.tipo === "MOTOTAXI" ? "tu carrera en mototaxi" : "el delivery"} hacia ${args.destino} es de ${tarifa.toFixed(2)} Bs.`,
      };
    }

    case "crear_pedido_delivery": {
      // Ruta legacy deshabilitada: los pedidos reales solo se crean con una
      // cotización oficial y una confirmación explícita verificada por el canal.
      await logActivity(
        "Intento de pedido por ruta legacy bloqueado",
        "assistant_groq",
        "blocked",
        args
      );
      return {
        error:
          "La creación directa de pedidos está deshabilitada. Usa 'preparar_resumen_pedido' para cotizar y 'registrar_pedido' con el quoteId tras la confirmación explícita del cliente.",
      };
    }

    case "solicitar_mototaxi": {
      if (safeMode) {
        return {
          estado: "simulado",
          mensaje: `[MODO SEGURO]: Mototaxi solicitada de ${args.origen} a ${args.destino}.`,
        };
      }

      let customer = await prisma.customer.findUnique({
        where: { phone: args.pasajeroTelefono },
      });
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            phone: args.pasajeroTelefono,
            name: args.pasajeroNombre || "Pasajero",
          },
        });
      }

      const count = await prisma.rideTrip.count();
      const tripNumber = `VIAJE-${2000 + count + 1}`;
      const fare = args.vehiculo === "TORITO" ? 5.0 : 4.0;

      const trip = await prisma.rideTrip.create({
        data: {
          tripNumber,
          customerId: customer.id,
          vehicleType: args.vehiculo || "MOTO",
          originAddress: args.origen,
          destinationAddress: args.destino,
          fareAmount: fare,
          status: "SOLICITADO",
        },
      });

      await logActivity(`Carrera solicitada: ${tripNumber}`, "assistant_groq", "success", args);

      return {
        viajeId: trip.id,
        tripNumber: trip.tripNumber,
        tarifaBs: fare,
        estado: "SOLICITADO",
        mensaje: `¡Carrera ${tripNumber} solicitada! Estamos avisando a los conductores de ${args.vehiculo || "mototaxi"} más cercanos a ${args.origen}.`,
      };
    }

    case "consultar_estado_pedido": {
      const order = await prisma.order.findUnique({
        where: { orderNumber: args.codigo },
        include: { assignedRider: true },
      });
      if (order) {
        return {
          tipo: "DELIVERY",
          codigo: order.orderNumber,
          estado: order.status,
          repartidor: order.assignedRider?.name || "Por asignar",
          mensaje: `Tu pedido ${order.orderNumber} se encuentra en estado: ${order.status}.`,
        };
      }
      return { mensaje: `No encontramos ningún pedido activo con el código ${args.codigo}.` };
    }

    case "pasar_a_humano": {
      await logActivity("Pase a operador humano", "assistant_groq", "success", args);
      return {
        derivado: true,
        mensaje: "He avisado a nuestra operadora de despacho en Ivirgarzama para que tome la conversación y te atienda enseguida.",
      };
    }

    default:
      return { error: `Herramienta desconocida: ${name}` };
  }
}

/**
 * Invoca el motor de IA de TropiBot
 * Prioridad 1: Groq API (Plan 100% gratuito de alta velocidad con llama-3.3-70b-versatile)
 * Prioridad 2: OpenRouter API (Fallback)
 * Prioridad 3: Simulador contextualizado local para Ivirgarzama (Zero Config)
 */
export async function runAssistantChat(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  safeMode = false,
  context?: OrderToolContext
): Promise<AssistantResponse> {
  const groqKey = process.env.GROQ_API_KEY;
  const groqModel = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  // 1. Si existe GROQ_API_KEY configurada, usar el endpoint gratuito de Groq
  if (groqKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: groqModel,
          messages,
          tools: TROPIGO_ASSISTANT_TOOLS,
          tool_choice: "auto",
          temperature: 0.3,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const choice = data.choices?.[0]?.message;
        const toolCalls: ToolCallExecution[] = [];

        if (choice?.tool_calls?.length > 0) {
          for (const call of choice.tool_calls.slice(0, 4)) {
            const fnName = call.function.name;
            const fnArgs = JSON.parse(call.function.arguments || "{}");
            const result = await executeToolCall(fnName, fnArgs, safeMode, context);
            toolCalls.push({ tool: fnName, args: fnArgs, result });
          }
        }

        return {
          content: choice?.content || "Mensaje procesado por TropiGO.",
          toolCalls,
        };
      }
    } catch (e) {
      console.warn("Fallo temporal en llamada a Groq API, usando motor de respaldo...");
    }
  }

  // 2. Fallback contextualizado local para Ivirgarzama (funciona sin claves externas)
  const lastMsg = messages[messages.length - 1]?.content.toLowerCase() || "";
  const toolCalls: ToolCallExecution[] = [];
  let reply = "";

  if (
    lastMsg.includes("pollo") ||
    lastMsg.includes("broaster") ||
    lastMsg.includes("majadito") ||
    lastMsg.includes("pique") ||
    lastMsg.includes("menu") ||
    lastMsg.includes("plato") ||
    lastMsg.includes("precio") ||
    lastMsg.includes("comida")
  ) {
    const res = await executeToolCall("consultar_catalogo", { comercio: "Pollería El Pahuichi" }, safeMode, context);
    toolCalls.push({
      tool: "consultar_catalogo",
      args: { comercio: "El Pahuichi / Doña Julia" },
      result: res,
    });
    const platos = (res?.productos || [])
      .slice(0, 6)
      .map((p: any) => `• **${p.nombre}** [${p.comercio}]: ${p.precioTexto}`)
      .join("\n");
    reply =
      `¡Claro que sí! 🍗 Estos son los platos disponibles ahora en el sistema:\n\n${platos || "No hay platos disponibles en este momento."}\n\n` +
      "El costo de envío depende de tu zona exacta en Ivirgarzama. ¿Qué te gustaría pedir y a qué zona/barrio lo enviamos?";
  } else if (
    lastMsg.includes("moto") ||
    lastMsg.includes("torito") ||
    lastMsg.includes("carrera") ||
    lastMsg.includes("viaje") ||
    lastMsg.includes("terminal") ||
    lastMsg.includes("mercado")
  ) {
    const res = await executeToolCall("cotizar_tarifa", { tipo: "MOTOTAXI", destino: "Mercado Central", vehiculo: "MOTO" }, safeMode, context);
    toolCalls.push({
      tool: "cotizar_tarifa",
      args: { tipo: "MOTOTAXI", destino: "Mercado Central" },
      result: res,
    });
    reply = res?.mensajeOficial ||
      "Para cotizar tu mototaxi necesito la zona o barrio exacto de destino en Ivirgarzama.";
  } else if (
    lastMsg.includes("confirmo") ||
    lastMsg.includes("quiero") ||
    lastMsg.includes("mandame") ||
    lastMsg.includes("envia") ||
    lastMsg.includes("pido")
  ) {
    // Sin cotización oficial no se registra ningún pedido ni se inventan datos.
    reply =
      "¡Con gusto! Para preparar tu pedido necesito: 1) comercio, 2) producto(s) y cantidad, " +
      "3) variantes u opciones, 4) dirección/zona exacta de entrega y 5) método de pago (efectivo o QR). " +
      "Con esos datos genero el resumen oficial y te pido confirmación antes de registrar nada.";
  } else if (lastMsg.includes("reclamo") || lastMsg.includes("queja") || lastMsg.includes("humano") || lastMsg.includes("persona")) {
    const res = await executeToolCall("pasar_a_humano", { motivo: "Solicitud o reclamo del cliente" }, safeMode, context);
    toolCalls.push({
      tool: "pasar_a_humano",
      args: { motivo: "Derivación a operadora de despacho" },
      result: res,
    });
    reply =
      "Entiendo perfectamente. He transferido la conversación a nuestra operadora de despacho en Ivirgarzama para que te asista de inmediato.";
  } else {
    reply =
      "¡Hola! 👋 Te habla **TropiBot**, tu asistente inteligente de **TropiGO** en Ivirgarzama. ¿En qué te ayudo hoy? Puedo tomar tu pedido de comida de los mejores restaurantes, compras de farmacia o enviarte una mototaxi o torito a tu ubicación.";
  }

  return { content: reply, toolCalls };
}
