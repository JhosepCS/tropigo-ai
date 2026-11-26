import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkerBaseUrl } from "@/lib/whatsapp/worker-url";

export const dynamic = "force-dynamic";

/**
 * GET /api/channels/whatsapp/worker-status
 *
 * Estado real del worker de Baileys. Primero intenta hablar con el worker por
 * HTTP. Si el CRM está en Vercel y el worker corre en una PC sin URL pública,
 * usa el latido que el worker escribe en la base de datos cada 30 s.
 */
export async function GET() {
  const workerBase = getWorkerBaseUrl();

  let httpConnected = false;
  let httpData: any = null;
  let httpError: string | null = null;

  try {
    const res = await fetch(`${workerBase}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });

    if (res.ok) {
      httpData = await res.json();
      httpConnected = Boolean(httpData.baileysConnected);
    } else {
      httpError = `El worker respondió con estado ${res.status}.`;
    }
  } catch (error: any) {
    httpError =
      error?.message ||
      "No se pudo contactar al worker por HTTP. Se usará el latido de la base de datos.";
  }

  let channel: {
    status: string;
    phone: string | null;
    updatedAt: Date;
  } | null = null;

  try {
    channel = await prisma.channel.findFirst({
      where: { type: "whatsapp" },
      select: { status: true, phone: true, updatedAt: true },
    });
  } catch {
    channel = null;
  }

  const heartbeatFresh = channel
    ? Date.now() - channel.updatedAt.getTime() < 120_000
    : false;
  const dbConnected = channel?.status === "connected" && heartbeatFresh;
  const connected = httpConnected || dbConnected;

  return NextResponse.json({
    connected,
    source: httpConnected ? "worker" : dbConnected ? "db" : "none",
    workerUrl: workerBase,
    phone: channel?.phone || null,
    queuedChats: httpData?.queuedChats ?? 0,
    autoResumeSeconds:
      httpData?.autoResumeSeconds ??
      Number(process.env.AI_AUTO_RESUME_SECONDS || 17),
    uptimeSeconds: httpData?.uptimeSeconds ?? 0,
    lastHeartbeat: channel?.updatedAt?.toISOString() || null,
    timestamp: new Date().toISOString(),
    ...(httpError && !dbConnected ? { error: httpError } : {}),
  });
}
