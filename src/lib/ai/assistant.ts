import { prisma } from "../prisma";

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
 * Catálogo de herramientas (Tools) expuestas a OpenRouter
 */
export const ASSISTANT_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_merchants",
      description: "Lista los comercios y restaurantes afiliados a Tropigo en Ivirgarzama.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Categoría opcional (Pollería, Restaurante, Farmacia, Mandados).",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_menu",
      description: "Consulta el menú, productos disponibles y precios en Bolivianos (Bs.) de un comercio.",
      parameters: {
        type: "object",
        properties: {
          merchantId: {
            type: "string",
            description: "ID del comercio a consultar.",
          },
        },
        required: ["merchantId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate_delivery_cost",
      description: "Calcula la tarifa de delivery en Bolivianos (Bs.) según la zona o barrio de Ivirgarzama.",
      parameters: {
        type: "object",
        properties: {
          zoneName: {
            type: "string",
            description: "Nombre del barrio o punto de referencia en Ivirgarzama (ej: Mercado Central, Hospital San Francisco, Av. Mortensen, Senda 3).",
          },
        },
        required: ["zoneName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_order",
      description: "Crea y confirma un nuevo pedido en Tropigo con código TRP-XXXX.",
      parameters: {
        type: "object",
        properties: {
          customerId: { type: "string" },
          merchantId: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "number" },
                unitPrice: { type: "number" },
                notes: { type: "string" },
              },
              required: ["name", "quantity", "unitPrice"],
            },
          },
          deliveryAddress: { type: "string" },
          paymentMethod: {
            type: "string",
            enum: ["EFECTIVO", "QR_BANCO", "TIGO_MONEY"],
          },
          deliveryFee: { type: "number" },
        },
        required: ["items", "deliveryAddress", "paymentMethod"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_order_status",
      description: "Consulta el estado actual de un pedido dado su código (ej: TRP-1042).",
      parameters: {
        type: "object",
        properties: {
          orderNumber: { type: "string" },
        },
        required: ["orderNumber"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "escalate_to_human",
      description: "Pasa la conversación a un operador humano de Tropigo cuando hay un reclamo o el cliente lo solicita.",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string" },
        },
        required: ["reason"],
      },
    },
  },
];

/**
 * Ejecutor local de herramientas
 */
export async function executeToolCall(
  name: string,
  args: any,
  safeMode = false
): Promise<any> {
  switch (name) {
    case "get_merchants": {
      const where: any = { isActive: true };
      if (args.category) where.category = { contains: args.category, mode: "insensitive" };
      const merchants = await prisma.merchant.findMany({
        where,
        select: { id: true, name: true, category: true, address: true },
      });
      return merchants;
    }

    case "get_menu": {
      const products = await prisma.product.findMany({
        where: { merchantId: args.merchantId, isAvailable: true },
        select: { id: true, name: true, description: true, price: true, category: true },
      });
      return products;
    }

    case "calculate_delivery_cost": {
      const zone = await prisma.deliveryZone.findFirst({
        where: {
          name: { contains: args.zoneName, mode: "insensitive" },
          isActive: true,
        },
      });
      if (zone) {
        return {
          zone: zone.name,
          costBs: zone.baseCost,
          estimatedMinutes: zone.estimatedMinutes,
        };
      }
      return { zone: "Tarifa estándar Ivirgarzama", costBs: 5.0, estimatedMinutes: 25 };
    }

    case "create_order": {
      if (safeMode) {
        return {
          simulated: true,
          orderNumber: "TRP-SIMULADO",
          message: "Orden simulada exitosamente (Modo Seguro Activo). No se guardó en BD real.",
          items: args.items,
          total: args.items.reduce((s: number, it: any) => s + it.quantity * it.unitPrice, 0) + (args.deliveryFee || 5),
        };
      }

      // Generar correlativo TRP-XXXX
      const count = await prisma.order.count();
      const orderNumber = `TRP-${1040 + count + 1}`;

      const subtotal = args.items.reduce(
        (acc: number, it: any) => acc + it.quantity * it.unitPrice,
        0
      );
      const deliveryFee = args.deliveryFee || 5.0;
      const totalAmount = subtotal + deliveryFee;

      // Obtener un cliente predeterminado si no se envió ID
      let customerId = args.customerId;
      if (!customerId) {
        const cust = await prisma.customer.findFirst();
        customerId = cust?.id;
      }

      const order = await prisma.order.create({
        data: {
          orderNumber,
          customerId: customerId!,
          merchantId: args.merchantId,
          itemsJson: JSON.stringify(args.items),
          subtotal,
          deliveryFee,
          totalAmount,
          paymentMethod: args.paymentMethod || "EFECTIVO",
          status: "RECIBIDO",
          deliveryAddressText: args.deliveryAddress,
        },
      });

      return {
        orderNumber: order.orderNumber,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        totalAmount: order.totalAmount,
        status: order.status,
      };
    }

    case "check_order_status": {
      const order = await prisma.order.findUnique({
        where: { orderNumber: args.orderNumber },
        include: { assignedRider: true },
      });
      if (!order) return { error: "Pedido no encontrado" };
      return {
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.totalAmount,
        rider: order.assignedRider?.name || "Asignando repartidor...",
      };
    }

    case "escalate_to_human": {
      return {
        escalated: true,
        reason: args.reason,
        message: "Notificado al operador humano de Tropigo. Se pondrá en contacto enseguida.",
      };
    }

    default:
      return { error: `Herramienta desconocida: ${name}` };
  }
}

/**
 * Invoca OpenRouter con llamada a herramientas
 */
export async function runAssistantChat(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  safeMode = false
): Promise<AssistantResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const defaultModel = process.env.OPENROUTER_DEFAULT_MODEL || "anthropic/claude-3.5-haiku";

  // Si no hay API key configurada, ofrecemos un simulador inteligente local contextualizado a Ivirgarzama
  if (!apiKey) {
    const lastMsg = messages[messages.length - 1]?.content.toLowerCase() || "";
    const toolCalls: ToolCallExecution[] = [];

    let reply = "";
    if (lastMsg.includes("pollo") || lastMsg.includes("broaster")) {
      const menu = await executeToolCall("get_menu", { merchantId: "dummy" }, safeMode);
      toolCalls.push({
        tool: "get_menu",
        args: { merchant: "Pollos El Rey del Trópico" },
        result: [
          { name: "1/4 Pollo Broaster con papas y chaufa", price: 22 },
          { name: "1/2 Pollo a la Brasa", price: 40 },
        ],
      });
      reply =
        "¡Excelente elección! 🍗 En *Pollos El Rey del Trópico* tenemos:\n\n• 1/4 Pollo Broaster con papas y arroz chaufa: *22 Bs.*\n• 1/2 Pollo a la Brasa con plátano y ensalada: *40 Bs.*\n\n¿Cuántos cuartos deseas pedir y a qué zona o dirección te lo enviamos?";
    } else if (lastMsg.includes("ubicacion") || lastMsg.includes("senda") || lastMsg.includes("hospital") || lastMsg.includes("mercado")) {
      const cost = await executeToolCall("calculate_delivery_cost", { zoneName: lastMsg }, safeMode);
      toolCalls.push({
        tool: "calculate_delivery_cost",
        args: { zoneName: lastMsg },
        result: cost,
      });
      reply = `Perfecto. La tarifa de delivery para esa zona en Ivirgarzama es de *${cost.costBs} Bs.* (tiempo estimado: ${cost.estimatedMinutes} min). 🛵💨\n\n¿Deseas pagar en Efectivo al recibir, por QR Banco (BCP/Unión) o Tigo Money?`;
    } else if (lastMsg.includes("confirmar") || lastMsg.includes("pido") || lastMsg.includes("orden")) {
      const orderRes = await executeToolCall(
        "create_order",
        {
          items: [{ name: "1/4 Pollo Broaster con papas y chaufa", quantity: 2, unitPrice: 22.0 }],
          deliveryAddress: "Av. Mortensen frente a la plaza",
          paymentMethod: "EFECTIVO",
          deliveryFee: 5.0,
        },
        safeMode
      );
      toolCalls.push({
        tool: "create_order",
        args: { items: "2x 1/4 Pollo", address: "Ivirgarzama Centro" },
        result: orderRes,
      });
      reply = `¡Tu pedido ha sido confirmado con éxito! 🎉\n\n📋 *Código de Pedido:* ${orderRes.orderNumber}\n💵 *Total a pagar:* ${orderRes.totalAmount} Bs. (con envío incluido)\n🛵 Un repartidor de Tropigo ya está asignado. Te avisaremos cuando vaya en camino.`;
    } else {
      reply =
        "¡Hola! 👋 Te habla TropiBot de Tropigo Delivery en Ivirgarzama. 🛵💨\n\n¿Qué se te antoja pedir hoy? Tenemos:\n1. 🍗 Pollos Broaster y a la Brasa (El Rey del Trópico)\n2. 🍔 Hamburguesas y Salchipapas (La Chura)\n3. 🐟 Pescado del Trópico (Pacú y Surubí)\n4. 💊 Farmacia San Elías\n5. 📦 Servicio de Mandados y Encomiendas\n\nEscríbeme lo que gustes o envíame un audio.";
    }

    return { content: reply, toolCalls };
  }

  // Llamada oficial a OpenRouter API compatible con OpenAI
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
        "X-Title": "Tropigo Delivery Ivirgarzama",
      },
      body: JSON.stringify({
        model: defaultModel,
        messages,
        tools: ASSISTANT_TOOLS,
        tool_choice: "auto",
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenRouter Error ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0]?.message;
    const toolCalls: ToolCallExecution[] = [];

    if (choice?.tool_calls?.length > 0) {
      for (const call of choice.tool_calls) {
        const fnName = call.function.name;
        const fnArgs = JSON.parse(call.function.arguments || "{}");
        const execResult = await executeToolCall(fnName, fnArgs, safeMode);
        toolCalls.push({
          tool: fnName,
          args: fnArgs,
          result: execResult,
        });
      }
    }

    return {
      content: choice?.content || "Pedido recibido y procesado por Tropigo.",
      toolCalls,
    };
  } catch (error: any) {
    console.error("Error en OpenRouter:", error);
    return {
      content: "Disculpa, hubo un problema momentáneo de conexión con la IA. Ya avisamos al equipo de Tropigo.",
      toolCalls: [],
    };
  }
}
