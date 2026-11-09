import { NextRequest, NextResponse } from "next/server";
import { initiateMetaCoexistence, getMaskedWhatsAppStatus } from "@/lib/whatsapp/meta-manager";
import { requireAuth } from "@/lib/auth/rbac";

export async function POST(req: NextRequest) {
  try {
    await requireAuth().catch(() => null);

    const result = await initiateMetaCoexistence();
    const origin = req.headers.get("origin") || req.nextUrl.origin || undefined;
    const updatedStatus = await getMaskedWhatsAppStatus(origin);

    return NextResponse.json({
      success: result.success,
      coexistenceQr: result.coexistenceQr,
      coexistenceCode: result.coexistenceCode,
      message: result.message,
      error: result.error,
      status: updatedStatus,
    });
  } catch (error: any) {
    console.error("Error en flujo de coexistencia Meta:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al procesar coexistencia con Meta." },
      { status: 500 }
    );
  }
}
