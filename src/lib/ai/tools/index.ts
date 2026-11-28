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
import { paymentMethodsTool } from "./payments-tool";
import { paymentStatusTool } from "./payment-status-tool";
import { locationRequestTool } from "./location-request-tool";
import { recommendationTool } from "./recommendation-tool";
import { promotionsTool } from "./promotions-tool";
import { catalogVisualTool } from "./catalog-visual-tool";
import { getActivePromotionsNow } from "../../promotions/active-promos";
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
export * from "./payments-tool";
export * from "./payment-status-tool";
export * from "./location-request-tool";
export * from "./recommendation-tool";
export * from "./promotions-tool";
export * from "./catalog-visual-tool";

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
  paymentMethodsTool,
  paymentStatusTool,
  locationRequestTool,
  recommendationTool,
  promotionsTool,
  catalogVisualTool,
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

const CORE_TOOL_NAMES = new Set([
  "consultar_catalogo",
  "preparar_resumen_pedido",
  "registrar_pedido",
  "cotizar_tarifa",
  "consultar_zonas_cobertura",
  "solicitar_ubicacion",
  "pasar_a_humano",
]);

/**
 * Selecciona solo las herramientas relevantes según los últimos mensajes del chat.
 * Reduce drásticamente los tokens enviados por ronda sin perder ninguna capacidad.
 */
export function selectToolDefinitionsForContext(
  messages: Array<{ role: string; content: string }>
): ToolDefinitionOpenAI[] {
  const recentText = messages
    .filter((m) => m.role !== "system")
    .slice(-4)
    .map((m) => m.content || "")
    .join(" ")
    .toLowerCase();

  const selected = new Set<string>(CORE_TOOL_NAMES);

  if (/(comercio|restaurante|tienda|farmacia|market|abierto|horario|cierra|abre|servicio|mandado|env[ií]o|disponib|precio)/i.test(recentText)) {
    selected.add("consultar_comercios");
    selected.add("consultar_precios_disponibilidad");
    selected.add("consultar_horarios");
    selected.add("consultar_servicios");
  }

  if (/(pedido|orden|trp-|estado|donde va|repartidor|rider|demora|llega)/i.test(recentText)) {
    selected.add("consultar_estado_pedido");
  }

  if (/(sello|fidelidad|premio|punto|nivel|bronce|plata|oro|tgo-|tarjeta)/i.test(recentText)) {
    selected.add("consultar_mi_fidelidad");
    selected.add("consultar_fidelidad_por_codigo");
  }

  if (/(pago|pagar|qr|cuenta|transferencia|yape|tigo|altoke|zas|comprobante|efectivo)/i.test(recentText)) {
    selected.add("consultar_metodos_pago");
    selected.add("consultar_mis_pagos");
  }

  if (/(foto|imagen|visual|carta|recomienda|sugier|antes|anterior|favorit|promo|oferta|descuento)/i.test(recentText)) {
    selected.add("mostrar_catalogo_visual");
    selected.add("sugerir_pedido_anterior");
    selected.add("consultar_promociones");
  }

  if (/(me llamo|soy |mi nombre|vivo en|mi direcci[oó]n|siempre sin|prefiero|recuerda)/i.test(recentText)) {
    selected.add("guardar_memoria_cliente");
  }

  return TROPIGO_TOOLS.filter((t) => selected.has(t.name)).map((tool) => ({
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
    const [merchants, products, zones, business, activePromos] = await Promise.all([
      prisma.merchant.findMany({
        where: { isOpen: true },
        select: { name: true, category: true, phone: true, address: true, isOpen: true },
        take: 4,
      }),
      prisma.product.findMany({
        where: { isAvailable: true },
        select: {
          name: true,
          price: true,
          merchant: { select: { name: true } },
          category: true,
        },
        take: 6,
      }),
      prisma.deliveryZone.findMany({
        where: { isActive: true },
        select: { name: true, baseDeliveryCost: true, baseRideCost: true, estimatedMinutes: true },
      }),
      prisma.businessProfile.findFirst(),
      getActivePromotionsNow().catch(() => []),
    ]);

    const activePromosText =
      Array.isArray(activePromos) && activePromos.length > 0
        ? (activePromos as any[])
            .map((p: any) => `${p.title} (${p.discountPercent}% OFF)`)
            .join(" | ")
        : "Sin promos activas";

    const cleanMerchants = merchants
      .map((m: any) => `${m.name.replace(/^\[DEMO\]\s*/i, "")} (${m.category})`)
      .join(" | ");

    const cleanProducts = products
      .map(
        (p: any) =>
          `${p.name.replace(/^\[DEMO\]\s*/i, "")} [${p.merchant.name.replace(/^\[DEMO\]\s*/i, "")}]: ${p.price.toFixed(0)} Bs`
      )
      .join(" | ");

    const minRideFare = Math.max(10, Number(business?.rideMinFare) || 10);
    const toritoSurcharge = Math.max(
      0,
      Number(business?.rideToritoSurcharge) || 0
    );

    const cleanZones = zones
      .map(
        (z: any) =>
          `${z.name}: Envío ${z.baseDeliveryCost.toFixed(0)} Bs / Moto ${Math.max(
            z.baseRideCost,
            minRideFare
          ).toFixed(0)} Bs`
      )
      .join(" | ");

    const stampsRequired = Math.max(
      2,
      Math.floor(Number(business?.loyaltyStampsRequired) || 10)
    );
    const loyaltyBlock = business?.loyaltyEnabled
      ? `Activo (${stampsRequired - 1} sellos -> #${stampsRequired} gratis)`
      : "Pausado";

    return (
      `[DATOS EN VIVO IVIRGARZAMA]\n` +
      `Comercios: ${cleanMerchants || "Disponibles en catálogo"}\n` +
      `Destacados: ${cleanProducts || "Consultar catálogo"}\n` +
      `Zonas: ${cleanZones || `Urbana: Envío 5 Bs / Moto ${minRideFare} Bs`} (+${Number(
        business?.deliveryPerKmFee ?? 2
      ).toFixed(0)} Bs/km extra tras ${Number(business?.deliveryIncludedKm ?? 2).toFixed(0)} km desde Plaza Principal)\n` +
      `Carrera mín: Moto ${minRideFare.toFixed(0)} Bs | Torito +${toritoSurcharge.toFixed(0)} Bs\n` +
      `Promos: ${activePromosText} | Fidelidad: ${loyaltyBlock}`
    );
  } catch (e: any) {
    console.warn("[Tools] No se pudo generar contexto de datos en tiempo real:", e.message);
    return "";
  }
}
