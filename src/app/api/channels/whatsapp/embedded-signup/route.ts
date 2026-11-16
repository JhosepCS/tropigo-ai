import { NextRequest, NextResponse } from "next/server";
import { handleEmbeddedSignupExchange, getMaskedWhatsAppStatus } from "@/lib/whatsapp/meta-manager";
import { requireAuth, UnauthorizedError, ForbiddenError } from "@/lib/auth/rbac";

export async function POST(req: NextRequest) {
  try {
    await requireAuth();

    const body = await req.json();
    const { code, wabaId, phoneNumberId } = body;

    if (!code) {
      return NextResponse.json(
        { error: "Código de autorización de Meta no proporcionado." },
        { status: 400 }
      );
    }

    const result = await handleEmbeddedSignupExchange({
      code,
      wabaId,
      phoneNumberId,
    });

    const origin = req.headers.get("origin") || req.nextUrl.origin || undefined;
    const updatedStatus = await getMaskedWhatsAppStatus(origin);

    return NextResponse.json({
      success: result.success,
      error: result.error,
      status: updatedStatus,
    });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error en intercambio de Embedded Signup:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al procesar Embedded Signup de Meta." },
      { status: 500 }
    );
  }
}
