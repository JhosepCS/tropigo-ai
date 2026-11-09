import { NextResponse } from "next/server";
import { disconnectWhatsAppSecurely } from "@/lib/whatsapp/meta-manager";
import { requireAuth } from "@/lib/auth/rbac";

export async function POST() {
  try {
    await requireAuth().catch(() => null);
    await disconnectWhatsAppSecurely();
    return NextResponse.json({
      success: true,
      message: "WhatsApp Business Cloud API desconectado de forma segura.",
    });
  } catch (error: any) {
    console.error("Error al desconectar WhatsApp:", error);
    return NextResponse.json(
      { error: error.message || "Error al desconectar WhatsApp" },
      { status: 500 }
    );
  }
}
