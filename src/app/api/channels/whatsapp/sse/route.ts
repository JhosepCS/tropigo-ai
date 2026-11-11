import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ForbiddenError,
  UnauthorizedError,
  requireRole,
} from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole(["SUPERADMIN", "ADMIN", "OPERATOR"]);
  } catch (error) {
    const status =
      error instanceof UnauthorizedError
        ? 401
        : error instanceof ForbiddenError
          ? 403
          : 500;

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No autorizado" },
      { status }
    );
  }

  const encoder = new TextEncoder();
  let interval: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const stop = () => {
    closed = true;
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  };

  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = async () => {
        if (closed) return;

        try {
          const wp = await prisma.channel.findUnique({
            where: { type: "whatsapp" },
          });

          const payload = JSON.stringify({
            status: wp?.status || "disconnected",
            phone: wp?.phone || null,
            qrCode: wp?.qrCode || null,
          });

          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } catch {
          stop();
          try {
            controller.close();
          } catch {
            // El stream ya estaba cerrado.
          }
        }
      };

      // Estado inicial inmediato
      await sendUpdate();

      // Actualizaciones cada 2 segundos
      interval = setInterval(sendUpdate, 2000);
    },
    cancel() {
      stop();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
