import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { provider, action } = await req.json();
    const integration = await prisma.integration.findUnique({
      where: { provider },
    });

    if (!integration) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const newStatus = action === "disconnect" ? "disconnected" : "connected";
    const updated = await prisma.integration.update({
      where: { provider },
      data: {
        status: newStatus,
        accountIdentifier: newStatus === "connected" ? "cuenta@clinicalumen.es" : null,
      },
    });

    return NextResponse.json({ success: true, integration: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
