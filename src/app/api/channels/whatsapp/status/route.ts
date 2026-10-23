import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const wp = await prisma.channel.findUnique({
    where: { type: "whatsapp" },
  });

  return NextResponse.json({
    status: wp?.status || "disconnected",
    phone: wp?.phone || null,
    qrCode: wp?.qrCode || null,
  });
}
