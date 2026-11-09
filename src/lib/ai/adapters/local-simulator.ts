import { IAAdapter, ChatMessage, CompletionOptions, CompletionResult, ConnectionTestResult, ToolCallResult } from "../types";
import { executeTool } from "../tools";

export class LocalSimulatorAdapter implements IAAdapter {
  readonly providerName = "simulator" as const;

  async isAvailable(): Promise<boolean> {
    return true; // Siempre disponible como motor local de contingencia 0 Bs.
  }

  async testConnection(_options?: { model?: string }): Promise<ConnectionTestResult> {
    return {
      success: true,
      provider: "simulator",
      model: "local-ivirgarzama-v1",
      latencyMs: 1,
      sampleResponse: "Simulador Local de Ivirgarzama en línea y conectado a la base de datos.",
    };
  }

  async generateText(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    const startTime = Date.now();
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const lower = lastUserMsg.toLowerCase();

    let responseContent = "";
    let operatorHandoff = false;
    const toolCalls: ToolCallResult[] = [];

    // 1. Reclamos y pase a operador humano (máxima prioridad)
    if (
      lower.includes("reclamo") ||
      lower.includes("humano") ||
      lower.includes("persona") ||
      lower.includes("operador") ||
      lower.includes("ayuda") ||
      lower.includes("no llegó") ||
      lower.includes("queja")
    ) {
      operatorHandoff = true;
      responseContent =
        "Comprendo perfectamente tu solicitud. He pausado la atención automática y derivado tu mensaje " +
        "a nuestra operadora de despacho en Ivirgarzama para que te atienda personalmente en este momento.";
    }
    // 2. Consulta de estado de pedido o carrera (TRP-XXXX o VIAJE-XXXX)
    else if (
      lower.includes("trp-") ||
      lower.includes("viaje-") ||
      (lower.includes("estado") && (lower.includes("pedido") || lower.includes("orden") || lower.includes("carrera"))) ||
      lower.includes("cómo va mi pedido") ||
      lower.includes("como va mi pedido") ||
      lower.includes("dónde está mi pedido")
    ) {
      const match = lastUserMsg.match(/(TRP-\d+|VIAJE-\d+)/i);
      const codigo = match ? match[1].toUpperCase() : undefined;
      const res = await executeTool("consultar_estado_pedido", { codigo }, options?.toolContext);
      toolCalls.push({ tool: "consultar_estado_pedido", args: { codigo }, result: res });
      responseContent = res.mensaje || "Consultando el estado de tu orden en el sistema...";
    }
    // 3. Confirmación explícita de pedido.
    // El simulador local NO registra pedidos reales: la creación solo ocurre
    // en el webhook de WhatsApp con una cotización y una confirmación reales.
    else if (
      lower.includes("sí, confirmo") ||
      lower.includes("si, confirmo") ||
      lower.includes("si confirmo") ||
      lower.includes("confirmo") ||
      lower.includes("confirmar pedido") ||
      lower.includes("dale adelante") ||
      lower.includes("de acuerdo, envíalo") ||
      lower.includes("de acuerdo, envialo")
    ) {
      responseContent =
        "Para registrar un pedido real necesito una cotización oficial de esta conversación y tu confirmación explícita. " +
        "El simulador no crea pedidos en la base de datos. Si estás en WhatsApp, responde *\"Sí, confirmo\"* después de ver el resumen; " +
        "si aún no viste el resumen, indícame comercio, productos, cantidades y dirección para prepararlo.";
    }
    // 4. Cancelación de pedido antes de confirmar
    else if (lower.includes("cancelar") || lower.includes("ya no quiero") || lower.includes("cancela el pedido")) {
      responseContent =
        "Entendido. No se ha registrado ningún pedido nuevo ni cobro alguno. " +
        "Si ya tenías un pedido confirmado y deseas cancelarlo, un operador debe gestionarlo en el CRM. " +
        "Si más adelante deseas pedir algo de comida, compras o mototaxi en Ivirgarzama, avísame con gusto.";
    }
    // 5. Intención de pedido. El simulador no inventa comercio, producto,
    // cantidad ni dirección: solicita los datos y deja que el flujo oficial
    // (webhook + cotización) haga la validación real.
    else if (
      lower.includes("quiero pedir") ||
      lower.includes("deseo pedir") ||
      lower.includes("por favor envíame") ||
      lower.includes("anótame") ||
      lower.includes("anotame") ||
      (lower.includes("pedir") && (lower.includes("pollo") || lower.includes("pique") || lower.includes("majadito") || lower.includes("cuarto")))
    ) {
      responseContent =
        "¡Con gusto! Para preparar tu pedido necesito que me indiques: 1) comercio, 2) producto(s) y cantidad, " +
        "3) variantes u opciones, 4) dirección/zona exacta de entrega y 5) método de pago (efectivo o QR). " +
        "Con esos datos preparo el resumen oficial y te pido confirmación antes de registrar nada.";
    }
    // 3. Consulta de horarios de comercios
    else if (lower.includes("horario") || lower.includes("hora") || lower.includes("abren") || lower.includes("abierto")) {
      let com = "El Pahuichi";
      if (lower.includes("julia")) com = "Doña Julia";
      if (lower.includes("farmacia") || lower.includes("bolivia")) com = "Farmacia Bolivia";

      const res = await executeTool("consultar_horarios", { comercio: com }, options?.toolContext);
      toolCalls.push({ tool: "consultar_horarios", args: { comercio: com }, result: res });
      responseContent = res.mensaje || `Los horarios de ${com} se encuentran configurados en la base de datos.`;
    }
    // 4. Consulta de precios y disponibilidad específica
    else if (
      (lower.includes("precio") || lower.includes("cuanto cuesta") || lower.includes("cuánto cuesta")) &&
      (lower.includes("pollo") || lower.includes("pique") || lower.includes("majadito") || lower.includes("paracetamol"))
    ) {
      let prod = "Pollo a la Broaster";
      if (lower.includes("pique")) prod = "Pique Macho";
      if (lower.includes("majadito")) prod = "Majadito";
      if (lower.includes("paracetamol")) prod = "Paracetamol";

      const res = await executeTool("consultar_precios_disponibilidad", { producto: prod }, options?.toolContext);
      toolCalls.push({ tool: "consultar_precios_disponibilidad", args: { producto: prod }, result: res });

      if (res.encontrado && res.resultados?.[0]) {
        const item = res.resultados[0];
        const variantesText = item.variantes.length > 0
          ? ` Variantes: ${item.variantes.map((v: any) => `${v.nombre} (${v.precioBs} Bs.)`).join(", ")}.`
          : "";
        responseContent = `El plato ${item.producto} de ${item.comercio} cuesta ${item.precioFormateado}.${variantesText} Estado en cocina: ${item.disponibleEnCocina ? "Disponible" : "Agotado"}. ¿Deseas pedirlo?`;
      } else {
        responseContent = res.mensaje;
      }
    }
    // 5. Cotización de tarifas de delivery o mototaxi
    else if (
      lower.includes("tarifa") ||
      lower.includes("cuanto") ||
      lower.includes("cuánto") ||
      lower.includes("costo") ||
      lower.includes("envio") ||
      lower.includes("envío") ||
      lower.includes("carrera")
    ) {
      const tipo = lower.includes("moto") || lower.includes("carrera") || lower.includes("torito") ? "MOTOTAXI" : "DELIVERY";
      const vehiculo = lower.includes("torito") ? "TORITO" : "MOTO";
      let dest: string | null = null;
      if (lower.includes("mortensen")) dest = "Av. Mortensen";
      if (lower.includes("magisterio")) dest = "Barrio Magisterio";
      if (lower.includes("villa 14")) dest = "Villa 14";
      if (lower.includes("senda 3") || lower.includes("senda iii")) dest = "Senda III";
      if (lower.includes("casco central") || lower.includes("centro")) dest = "Casco Central";

      if (!dest) {
        responseContent =
          "Para cotizar la tarifa oficial necesito tu zona o barrio exacto de destino en Ivirgarzama " +
          "(por ejemplo: Casco Central, Av. Mortensen, Villa 14, Senda III). No aplico una zona por defecto.";
      } else {
        const res = await executeTool("cotizar_tarifa", { tipo, destino: dest, vehiculo }, options?.toolContext);
        toolCalls.push({ tool: "cotizar_tarifa", args: { tipo, destino: dest, vehiculo }, result: res });
        responseContent =
          res.mensajeOficial ||
          res.error ||
          `No se encontró una tarifa oficial para ${dest}.`;
      }
    }
    // 6. Zonas de cobertura
    else if (lower.includes("zona") || lower.includes("cobertura") || lower.includes("donde llegan") || lower.includes("dónde llegan")) {
      const res = await executeTool("consultar_zonas_cobertura", {}, options?.toolContext);
      toolCalls.push({ tool: "consultar_zonas_cobertura", args: {}, result: res });

      const lista = (res.zonas || []).map((z: any) => `• ${z.nombre}: Delivery ${z.tarifaBaseDeliveryBs} Bs. / Moto ${z.tarifaBaseMototaxiBs} Bs.`).join("\n");
      responseContent = `🌴 Zonas de cobertura oficiales en Ivirgarzama:\n${lista}\n\n¿A qué zona deseas solicitar tu servicio?`;
    }
    // 7. Información de servicios
    else if (lower.includes("servicio") || lower.includes("que hacen") || lower.includes("qué hacen")) {
      const res = await executeTool("consultar_servicios", {}, options?.toolContext);
      toolCalls.push({ tool: "consultar_servicios", args: {}, result: res });

      const lista = (res.servicios || []).map((s: any) => `• *${s.nombre}*: ${s.descripcion} (Desde ${s.tarifaBaseBs} Bs.)`).join("\n");
      responseContent = `🌴 Servicios disponibles en TropiGO Ivirgarzama:\n\n${lista}\n\n¿Cuál de ellos necesitas hoy?`;
    }
    // 8. Comercios registrados
    else if (lower.includes("restaurante") || lower.includes("comercio") || lower.includes("tienda") || lower.includes("donde pedir")) {
      const res = await executeTool("consultar_comercios", { soloAbiertos: true }, options?.toolContext);
      toolCalls.push({ tool: "consultar_comercios", args: { soloAbiertos: true }, result: res });

      const lista = (res.comercios || []).map((c: any) => `• *${c.nombre}* (${c.categoria}): ${c.direccion} - Calificación ⭐ ${c.calificacion}`).join("\n");
      responseContent = `🌴 Comercios afiliados abiertos en Ivirgarzama:\n\n${lista}\n\n¿Deseas ver el menú de alguno en particular?`;
    }
    // 9. Catálogo de productos y platos (por defecto ante saludos y consultas de comida)
    else {
      const res = await executeTool("consultar_catalogo", { soloDisponibles: true }, options?.toolContext);
      toolCalls.push({ tool: "consultar_catalogo", args: { soloDisponibles: true }, result: res });

      const platos = (res.productos || []).slice(0, 4).map((p: any) => `• *${p.nombre}* [${p.comercio}]: ${p.precioTexto}`).join("\n");
      responseContent =
        `¡Hola! 🌴 Te atiende TropiBot en Ivirgarzama. Platos destacados disponibles hoy en el sistema:\n\n` +
        `${platos}\n\n` +
        `También tenemos mototaxis, toritos y mandados express. ¿Qué se te antoja pedir hoy?`;
    }

    const latencyMs = Math.max(120, Date.now() - startTime);

    return {
      content: responseContent,
      provider: "simulator",
      model: "local-ivirgarzama-v1",
      latencyMs,
      tokensUsed: 65,
      fallbackUsed: true,
      operatorHandoff,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      alertAdmin: false,
    };
  }
}
