import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { enabled, primaryColor, welcomeMessage } = await req.json();

    const updated = await prisma.channel.upsert({
      where: { type: "webchat" },
      update: {
        status: enabled ? "connected" : "disconnected",
        settingsJson: JSON.stringify({ enabled, primaryColor, welcomeMessage }),
      },
      create: {
        type: "webchat",
        status: enabled ? "connected" : "disconnected",
        settingsJson: JSON.stringify({ enabled, primaryColor, welcomeMessage }),
      },
    });

    return NextResponse.json({ success: true, channel: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
