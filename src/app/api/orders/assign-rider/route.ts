import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { orderId, riderId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { assignedRiderId: riderId || null },
    });

    return NextResponse.json({ success: true, order: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
