import { NextRequest, NextResponse } from "next/server";
import { saveStandardMetaCredentials, verifyMetaConnection, getMaskedWhatsAppStatus } from "@/lib/whatsapp/meta-manager";
import { requireAuth } from "@/lib/auth/rbac";

export async function POST(req: NextRequest) {
  try {
    await requireAuth().catch(() => null);

    const body = await req.json();
    const {
      metaAppId,
      metaAppSecret,
      metaPhoneNumberId,
      metaWabaId,
      metaSystemToken,
      metaWebhookVerifyToken,
      autoVerify,
    } = body;

    if (!metaPhoneNumberId || !metaPhoneNumberId.trim()) {
      return NextResponse.json(
        { error: "El Identificador de número de teléfono (Phone Number ID) es obligatorio." },
        { status: 400 }
      );
    }

    await saveStandardMetaCredentials({
      metaAppId,
      metaAppSecret,
      metaPhoneNumberId,
      metaWabaId,
      metaSystemToken,
      metaWebhookVerifyToken,
    });

    let verificationResult: any = null;
    if (autoVerify) {
      verificationResult = await verifyMetaConnection();
    }

    const origin = req.headers.get("origin") || req.nextUrl.origin || undefined;
    const updatedStatus = await getMaskedWhatsAppStatus(origin);

    return NextResponse.json({
      success: true,
      message: "Credenciales de WhatsApp Business Cloud API guardadas y cifradas exitosamente.",
      verification: verificationResult,
      status: updatedStatus,
    });
  } catch (error: any) {
    console.error("Error al guardar credenciales de WhatsApp:", error);
    return NextResponse.json(
      { error: error.message || "Error al guardar credenciales de WhatsApp." },
      { status: 500 }
    );
  }
}
