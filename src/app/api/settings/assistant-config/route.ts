import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const assistant = await prisma.assistantConfig.findFirst();
    if (!assistant) return NextResponse.json({ error: "No config" }, { status: 404 });

    const updated = await prisma.assistantConfig.update({
      where: { id: assistant.id },
      data: {
        name: body.name,
        avatarUrl: body.avatarUrl,
        tone: body.tone,
        welcomeMessage: body.welcomeMessage,
        instructions: body.instructions,
        prohibitedActions: body.prohibitedActions,
        offHoursPolicy: body.offHoursPolicy,
        handoffRules: body.handoffRules,
        customHandoffRule: body.customHandoffRule,
      },
    });

    return NextResponse.json({ success: true, assistant: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
