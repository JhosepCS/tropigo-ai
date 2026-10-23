import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { enabled } = await req.json();
    const business = await prisma.businessProfile.findFirst();
    if (!business) return NextResponse.json({ error: "No profile" }, { status: 404 });

    const updated = await prisma.businessProfile.update({
      where: { id: business.id },
      data: { assistantEnabled: Boolean(enabled) },
    });

    return NextResponse.json({ success: true, assistantEnabled: updated.assistantEnabled });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
