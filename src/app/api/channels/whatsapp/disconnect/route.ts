import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  await prisma.channel.update({
    where: { type: "whatsapp" },
    data: {
      status: "disconnected",
      qrCode: null,
      phone: null,
      whatsappLid: null,
    },
  });

  await prisma.workerCommand.create({
    data: {
      command: "DISCONNECT_WHATSAPP",
    },
  });

  return NextResponse.json({ success: true });
}
