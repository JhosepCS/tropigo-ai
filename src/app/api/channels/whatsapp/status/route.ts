import { NextRequest, NextResponse } from "next/server";
import { getMaskedWhatsAppStatus } from "@/lib/whatsapp/meta-manager";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const origin = req.headers.get("origin") || req.nextUrl.origin || undefined;
    const status = await getMaskedWhatsAppStatus(origin);
    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error: any) {
    console.error("Error al obtener estado de WhatsApp Meta Cloud API:", error);
    return NextResponse.json(
      { error: error.message || "Error al obtener estado de WhatsApp" },
      { status: 500 }
    );
  }
}
