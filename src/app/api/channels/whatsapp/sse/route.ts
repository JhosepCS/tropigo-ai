import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = async () => {
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
        } catch (e) {
          // ignore stream error
        }
      };

      // Send immediate first state
      await sendUpdate();

      // Send update every 2 seconds
      const interval = setInterval(async () => {
        try {
          await sendUpdate();
        } catch {
          clearInterval(interval);
          controller.close();
        }
      }, 2000);

      // Cleanup on close
      return () => {
        clearInterval(interval);
      };
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
