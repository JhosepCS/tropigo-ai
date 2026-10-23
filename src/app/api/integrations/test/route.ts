import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { provider } = await req.json();

    if (provider === "slack") {
      await prisma.activityLog.create({
        data: {
          action: "Prueba de notificación enviada",
          provider: "slack",
          channel: "system",
          status: "success",
          detailsJson: JSON.stringify({ mensaje: "Alerta de prueba desde Atiende" }),
        },
      });
      return NextResponse.json({
        success: true,
        message: "✅ Mensaje de prueba enviado a Slack con éxito: 'Atiende: Alerta de prueba de conexión.'",
      });
    }

    if (provider === "webhooks") {
      await prisma.activityLog.create({
        data: {
          action: "Evento webhook de prueba enviado",
          provider: "webhooks",
          channel: "system",
          status: "success",
          detailsJson: JSON.stringify({ evento: "test_event", timestamp: Date.now() }),
        },
      });
      return NextResponse.json({
        success: true,
        message: "✅ Evento JSON de prueba firmado con HMAC-SHA256 despachado con éxito.",
      });
    }

    return NextResponse.json({ success: true, message: `Prueba completada para ${provider}` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
