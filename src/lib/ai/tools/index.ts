import { prisma } from "../../prisma";
import { IAssistantTool, ToolDefinitionOpenAI } from "./types";
import { merchantsTool } from "./merchants-tool";
import { catalogTool } from "./catalog-tool";
import { pricingTool } from "./pricing-tool";
import { schedulesTool } from "./schedules-tool";
import { zonesTool } from "./zones-tool";
import { deliveryFeesTool } from "./delivery-fees-tool";
import { servicesTool } from "./services-tool";
import { ordersTool } from "./orders-tool";
import { orderSummaryTool } from "./order-summary-tool";
import { orderCreateTool } from "./order-create-tool";
import { memoryTool } from "./memory-tool";
import { handoffTool } from "./handoff-tool";
import { loyaltyTool } from "./loyalty-tool";
import { loyaltyCodeTool } from "./loyalty-code-tool";
import { OrderToolContext } from "../../orders/order-service";

export * from "./types";
export * from "./merchants-tool";
export * from "./catalog-tool";
export * from "./pricing-tool";
export * from "./schedules-tool";
export * from "./zones-tool";
export * from "./delivery-fees-tool";
export * from "./services-tool";
export * from "./orders-tool";
export * from "./order-summary-tool";
export * from "./order-create-tool";
export * from "./memory-tool";
export * from "./handoff-tool";
export * from "./loyalty-tool";
export * from "./loyalty-code-tool";

/**
 * Catálogo modular completo de las herramientas internas de TropiGO
 */
export const TROPIGO_TOOLS: IAssistantTool[] = [
  merchantsTool,
  catalogTool,
  pricingTool,
  schedulesTool,
  zonesTool,
  deliveryFeesTool,
  servicesTool,
  ordersTool,
  orderSummaryTool,
  orderCreateTool,
  memoryTool,
  handoffTool,
  loyaltyTool,
  loyaltyCodeTool,
];

/**
 * Retorna las definiciones de las herramientas en formato JSON Schema compatible con OpenAI / Groq / Gemini
 */
export function getToolDefinitions(): ToolDefinitionOpenAI[] {
  return TROPIGO_TOOLS.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

/**
 * Ejecutor centralizado y seguro de herramientas conectado a la base de datos
 */
export async function executeTool(
  name: string,
  args: any,
  context?: OrderToolContext
): Promise<any> {
  const tool = TROPIGO_TOOLS.find((t) => t.name === name);

  if (!tool) {
    console.warn(`[Tool Dispatcher] Herramienta desconocida solicitada: ${name}`);
    return {
      error: `Herramienta desconocida: '${name}'. Las herramientas válidas son: ${TROPIGO_TOOLS.map(
        (t) => t.name
      ).join(", ")}`,
    };
  }

  const startTime = Date.now();
  try {
    const result = await tool.execute(args || {}, context);
    const latencyMs = Date.now() - startTime;

    const channel =
      context?.source === "WHATSAPP"
        ? "whatsapp"
        : context?.source === "WEBCHAT"
        ? "webchat"
        : context?.source === "CRM"
        ? "system"
        : "system";

    // Registrar auditoría en ActivityLog. No se registran credenciales ni
    // secretos: las tools solo reciben datos operativos del pedido.
    prisma.activityLog
      .create({
        data: {
          action: `TOOL_${name.toUpperCase()}`,
          entityName: "AIEngine",
          provider: "tropigo_tools",
          channel,
          status: result?.error ? "warning" : "success",
          detailsJson: JSON.stringify({
            args,
            latencyMs,
            source: context?.source || null,
            customerId: context?.customerId || null,
            conversationId: context?.conversationId || null,
          }),
          errorText: result?.error ? String(result.error).slice(0, 500) : null,
        },
      })
      .catch(() => {});

    return result;
  } catch (err: any) {
    console.error(`[Tool Dispatcher] Error al ejecutar herramienta '${name}':`, err);
    return {
      error: `Error al ejecutar ${name}: ${err.message}`,
    };
  }
}

/**
 * Construye un contexto en tiempo real con datos auténticos de la base de datos de Ivirgarzama.
 * Este resumen se inyecta en el prompt para que el asistente tenga los datos frescos
 * y nunca alucine platos, precios ni comercios.
 */
export async function getRealDataContextPrompt(): Promise<string> {
  try {
    const [merchants, products, zones, business] = await Promise.all([
      prisma.merchant.findMany({
        where: { isOpen: true },
        select: { name: true, category: true, phone: true, address: true, isOpen: true },
        take: 8,
      }),
      prisma.product.findMany({
        where: { isAvailable: true },
        select: {
          name: true,
          price: true,
          merchant: { select: { name: true } },
          category: true,
        },
        take: 15,
      }),
      prisma.deliveryZone.findMany({
        where: { isActive: true },
        select: { name: true, baseDeliveryCost: true, baseRideCost: true, estimatedMinutes: true },
      }),
      prisma.businessProfile.findFirst(),
    ]);

    const cleanMerchants = merchants
      .map((m) => `• ${m.name.replace(/^\[DEMO\]\s*/i, "")} (${m.category}) - ${m.address}`)
      .join("\n");

    const cleanProducts = products
      .map(
        (p) =>
          `• ${p.name.replace(/^\[DEMO\]\s*/i, "")} [${p.merchant.name.replace(/^\[DEMO\]\s*/i, "")}]: ${p.price.toFixed(
            2
          )} Bs.`
      )
      .join("\n");

    const minRideFare = Math.max(10, Number(business?.rideMinFare) || 10);
    const toritoSurcharge = Math.max(
      0,
      Number(business?.rideToritoSurcharge) || 0
    );

    const cleanZones = zones
      .map(
        (z) =>
          `• Zona ${z.name}: Delivery ${z.baseDeliveryCost.toFixed(2)} Bs. | Mototaxi ${Math.max(
            z.baseRideCost,
            minRideFare
          ).toFixed(2)} Bs. | Torito ${(
            Math.max(z.baseRideCost, minRideFare) + toritoSurcharge
          ).toFixed(2)} Bs. (~${z.estimatedMinutes} min)`
      )
      .join("\n");

    const stampsRequired = Math.max(
      2,
      Math.floor(Number(business?.loyaltyStampsRequired) || 10)
    );
    const countRides = business?.loyaltyCountRides ?? true;
    const loyaltyBlock = business?.loyaltyEnabled
      ? `Activo. Cada pedido entregado suma 1 sello${
          countRides
            ? " y cada carrera de mototaxi FINALIZADA también suma 1 sello"
            : ". Las carreras de mototaxi se muestran como dato adicional, pero no suman sellos"
        }. Al llegar a ${
          stampsRequired - 1
        } sellos, el pedido número ${stampsRequired} es gratis (${
          business?.loyaltyRewardDescription || "10mo pedido gratis"
        }). ${
          business?.loyaltyRewardFreeDelivery
            ? "El premio también cubre el envío."
            : "El envío del pedido premio se paga aparte."
        } Cada cliente tiene un QR personal con un código TGO-XXXXXXXX. Si el cliente envía una foto de su QR o escribe su código, usa 'consultar_fidelidad_por_codigo' o el bloque [TARJETA DE FIDELIDAD DETECTADA] para explicarle sus sellos exactos.`
      : "El programa de fidelidad está pausado temporalmente.";

    return `
=== DATOS OFICIALES EN VIVO DE TROPIGO (IVIRGARZAMA, BOLIVIA) ===
Moneda: Bolivianos (${business?.currencySymbol || "Bs."})

[COMERCIOS ABIERTOS EN ESTE MOMENTO]
${cleanMerchants || "Comercios registrados disponibles para pedidos."}

[CATÁLOGO DE PLATOS Y PRECIOS DISPONIBLES EN COCINA]
${cleanProducts || "Catálogo oficial activo en el CRM."}

[TARIFARIO OFICIAL POR ZONAS EN IVIRGARZAMA]
${cleanZones || `Tarifa base urbana: 5.00 Bs. delivery, ${minRideFare.toFixed(
      2
    )} Bs. mototaxi (mínimo oficial).`}

[TARIFAS DE CARRERA]
Tarifa mínima oficial: ${minRideFare.toFixed(2)} Bs. Recargo Torito/trimóvil: ${toritoSurcharge.toFixed(
      2
    )} Bs. La tarifa final nunca puede ser inferior a la mínima.

[PROGRAMA DE FIDELIDAD]
${loyaltyBlock}

REGLA DE INTEGRIDAD ESTRICTA Y PROTOCOLO DE PEDIDOS:
1. NUNCA inventes productos, precios, comercios, zonas ni tarifas. Usa exclusivamente lo devuelto por las herramientas y los datos oficiales de arriba.
2. NUNCA inventes distancias de recorrido por carretera. Si hay GPS, solo puedes informar la distancia en línea recta calculada; la tarifa se rige por la zona configurada.
3. FLUJO DE PEDIDOS DE DELIVERY (OBLIGATORIO PASO A PASO):
   a) El canal ya identifica al cliente por su WhatsApp. No le pidas teléfono ni nombre si ya están en el contexto.
   b) Consulta productos/menús con 'consultar_catalogo' o 'consultar_precios_disponibilidad'.
   c) Recopila cantidades, variantes, opciones y notas específicas.
   d) Solicita la dirección de entrega, zona/barrio exacto y punto de referencia (o ubicación GPS). Si el mensaje incluye coordenadas de una ubicación compartida por WhatsApp, pásalas como latitud/longitud a 'preparar_resumen_pedido'.
   e) Llama 'preparar_resumen_pedido'. Si devuelve requiereZona=true, NO inventes una zona ni uses una tarifa por defecto: pide al cliente que elija una de las zonasDisponibles y vuelve a llamar.
   f) Muestra el campo resumenTexto y pide confirmación explícita: '¿Confirmas tu pedido por X Bs.? Responde Sí, confirmo'.
   g) SOLO tras una confirmación explícita del cliente, llama 'registrar_pedido' con el quoteId devuelto por el resumen. No envíes teléfono, nombre, items, dirección ni precios: la cotización es la única fuente de verdad. El servidor verifica la confirmación real; un booleano del modelo no autoriza nada.
   h) Si 'registrar_pedido' no devuelve exitoso=true y un orderNumber TRP-XXXX, NO afirmes que el pedido fue registrado. Informa el error y ofrece corregirlo.
   i) Si el cliente pide modificar el pedido, prepara una NUEVA cotización con 'preparar_resumen_pedido' y pide confirmación otra vez. No reutilices una cotización anterior.
   j) Para seguimiento, usa 'consultar_estado_pedido'. La consulta se limita al cliente de la conversación.
4. DUPLICADOS: 'registrar_pedido' es idempotente. Si la cotización ya fue consumida, devuelve el pedido existente; no crees otra orden ni cambies el número.
5. ESTADOS: el cliente solo consulta. Los cambios de estado los realiza el CRM/operador o el repartidor asignado; no prometas cambios de estado que no hayan sido registrados.
6. FIDELIDAD: si el cliente pregunta por sus sellos, su premio o su QR personal, usa 'consultar_mi_fidelidad'. Si envía una foto de su QR/tarjeta o escribe un código TGO-XXXXXXXX, usa 'consultar_fidelidad_por_codigo' o los datos del bloque [TARJETA DE FIDELIDAD DETECTADA]. Explica siempre: sellos actuales, sellos faltantes, si el premio está disponible y en qué número de pedido/carrera se activa. No inventes sellos ni premios. Cuando 'preparar_resumen_pedido' devuelva premioFidelidadAplicado=true, el descuento ya está incluido en el total del resumen; no lo sumes ni lo dupliques.
=================================================================
`.trim();
  } catch (e: any) {
    console.warn("[Tools] No se pudo generar contexto de datos en tiempo real:", e.message);
    return "";
  }
}
