import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAssistantChat } from "@/lib/ai/assistant";

export async function POST(req: NextRequest) {
  try {
    const { messages, safeMode } = await req.json();

    const business = await prisma.businessProfile.findFirst();
    const assistant = await prisma.assistantConfig.findFirst();
    const services = await prisma.service.findMany({ where: { isActive: true } });
    const faqs = await prisma.faq.findMany();
    const kb = await prisma.knowledgeBase.findFirst();

    const systemPromptText = `Eres ${assistant?.name || "LumenBot"}, el asistente virtual de inteligencia artificial de «${business?.name || "Clínica Dental Lumen"}».
Dirección: ${business?.address || "Calle Gran Vía 42, 2º Izquierda, 28013 Madrid"}.
Teléfono: ${business?.phone || "+34 912 345 678"}.
Sitio web: ${business?.website || "https://clinicalumen.es"}.
Zona horaria: ${business?.timezone || "Europe/Madrid"}.
Fecha y hora actual: ${new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}.

TONO Y PERSONALIDAD:
- Tono: ${assistant?.tone || "cercano"} en español de España.
- ${assistant?.instructions}

COSAS PROHIBIDAS:
- ${assistant?.prohibitedActions}

HORARIO COMERCIAL:
- Lunes a Viernes de 09:00 a 14:00 y de 16:00 a 20:00.
- Sábados y Domingos: Cerrado.

SERVICIOS DISPONIBLES:
${services.map((s) => `- ${s.name} (${s.durationMinutes} min, ${s.price === 0 ? "Gratuito" : `${s.price} €`}): ${s.description}`).join("\n")}

PREGUNTAS FRECUENTES:
${faqs.map((f) => `P: ${f.question}\nR: ${f.answer}`).join("\n\n")}

CONOCIMIENTO ADICIONAL:
${kb?.freeText || ""}

REGLAS DE ACTUACIÓN:
1. En el primer mensaje preséntate amablemente como asistente virtual del negocio.
2. Antes de crear o cambiar una cita, confirma explícitamente el día, la hora y el servicio.
3. Si el paciente tiene dolor severo o urgencia, pasa a una persona y ofrece el teléfono de la clínica.`;

    const fullMessages = [
      { role: "system" as const, content: systemPromptText },
      ...(messages || []),
    ];

    const response = await runAssistantChat(
      fullMessages,
      safeMode !== undefined ? Boolean(safeMode) : Boolean(assistant?.safeMode)
    );

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Error en /api/assistant/chat:", error);
    return NextResponse.json(
      { content: "Error al procesar el mensaje", toolCalls: [] },
      { status: 500 }
    );
  }
}
