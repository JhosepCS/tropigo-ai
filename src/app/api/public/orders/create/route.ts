import { NextResponse } from "next/server";

/**
 * POST /api/public/orders/create
 *
 * DESHABILITADO POR SEGURIDAD.
 *
 * La creación pública de pedidos permitía enviar precios, cantidades y totales
 * arbitrarios desde el navegador, sin cotización ni confirmación verificada.
 * El único flujo válido de pedidos es:
 *   1. cotización oficial con 'preparar_resumen_pedido',
 *   2. confirmación explícita del cliente por WhatsApp,
 *   3. creación atómica con 'confirmAndCreateOrder'.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "La creación pública de pedidos está deshabilitada. " +
        "Los pedidos se cotizan y confirman por WhatsApp con el asistente de TropiGO.",
      code: "PUBLIC_ORDER_CREATION_DISABLED",
    },
    { status: 410 }
  );
}
