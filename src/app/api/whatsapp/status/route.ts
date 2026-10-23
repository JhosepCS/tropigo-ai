import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = await prisma.whatsAppConfig.findFirst();
  return NextResponse.json({
    activeProvider: config?.activeProvider || "BAILEYS_QR",
    baileysStatus: config?.baileysStatus || "DISCONNECTED",
    baileysQr: config?.baileysQr || null,
    connectedPhone: config?.connectedPhone || null,
  });
}
