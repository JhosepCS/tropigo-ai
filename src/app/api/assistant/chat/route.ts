import { NextRequest, NextResponse } from "next/server";
import { runAssistantChat } from "@/lib/ai/assistant";

export async function POST(req: NextRequest) {
  try {
    const { messages, safeMode } = await req.json();

    const systemPrompt = {
      role: "system" as const,
      content: `Eres TropiBot, el asistente de pedidos oficial de Tropigo Delivery en Ivirgarzama (Cochabamba, Bolivia).
Tu misión es atender pedidos de restaurantes (ej: Pollos El Rey del Trópico, Hamburguesas La Chura, Picantería Sabor Tropical), farmacia y mandados express.
Moneda: Bolivianos (Bs.).
Horario: Lunes a Domingo.
Flujo:
1. Ayuda a elegir del menú usando get_merchants y get_menu.
2. Solicita la dirección o barrio en Ivirgarzama y calcula la tarifa con calculate_delivery_cost.
3. Pregunta el método de pago (Efectivo, QR Banco o Tigo Money).
4. Cuando todo esté confirmado por el cliente, crea la orden con create_order.
5. Sé amable, conciso y responde como en WhatsApp.`,
    };

    const fullMessages = [systemPrompt, ...(messages || [])];
    const response = await runAssistantChat(fullMessages, Boolean(safeMode));

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Error en /api/assistant/chat:", error);
    return NextResponse.json(
      { content: "Error al procesar el mensaje", toolCalls: [] },
      { status: 500 }
    );
  }
}
