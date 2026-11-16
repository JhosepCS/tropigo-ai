import { NextRequest, NextResponse } from "next/server";
import { verifyMetaConnection, getMaskedWhatsAppStatus } from "@/lib/whatsapp/meta-manager";
import { requireAuth, UnauthorizedError, ForbiddenError } from "@/lib/auth/rbac";

export async function POST(req: NextRequest) {
  try {
    await requireAuth();

    const result = await verifyMetaConnection();
    const origin = req.headers.get("origin") || req.nextUrl.origin || undefined;
    const updatedStatus = await getMaskedWhatsAppStatus(origin);

    return NextResponse.json({
      success: result.success,
      accountDetails: result.accountDetails,
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
    console.error("Error al verificar conexión con Meta Cloud API:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al verificar conexión con Meta." },
      { status: 500 }
    );
  }
}
