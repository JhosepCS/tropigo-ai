import { NextResponse } from "next/server";
import { getWorkerBaseUrl } from "@/lib/whatsapp/worker-url";

export const dynamic = "force-dynamic";

/**
 * GET /api/channels/whatsapp/worker-status
 *
 * Estado real del worker de Baileys. El CRM lo usa para mostrar si el número
 * está conectado y si el bot puede recibir mensajes en este momento.
 */
export async function GET() {
  const workerBase = getWorkerBaseUrl();

  try {
    const res = await fetch(`${workerBase}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      return NextResponse.json({
        connected: false,
        workerUrl: workerBase,
        error: `El worker respondió con estado ${res.status}.`,
      });
    }

    const data = await res.json();
    return NextResponse.json({
      connected: Boolean(data.baileysConnected),
      workerUrl: workerBase,
      queuedChats: data.queuedChats ?? 0,
      autoResumeSeconds: data.autoResumeSeconds ?? 17,
      uptimeSeconds: data.uptimeSeconds ?? 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({
      connected: false,
      workerUrl: workerBase,
      error:
        error?.message ||
        "No se pudo contactar al worker. Verifica WORKER_URL y que el servicio esté encendido.",
    });
  }
}
