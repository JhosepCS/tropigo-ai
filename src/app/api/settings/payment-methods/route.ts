import { NextRequest, NextResponse } from "next/server";
import {
  ForbiddenError,
  UnauthorizedError,
  requireRole,
} from "@/lib/auth/rbac";
import {
  getPaymentMethods,
  savePaymentMethods,
} from "@/lib/payments/service";
import { parsePaymentMethods } from "@/lib/payments/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole(["SUPERADMIN", "ADMIN", "OPERATOR"]);
    const methods = await getPaymentMethods();
    return NextResponse.json({ success: true, methods });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[PaymentMethods] Error al leer métodos:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar los métodos de pago." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(["SUPERADMIN", "ADMIN", "OPERATOR"]);
    const body = await req.json().catch(() => ({}));
    const methods = parsePaymentMethods(body?.methods);

    if (methods.length === 0) {
      return NextResponse.json(
        { error: "Debes configurar al menos un método de pago." },
        { status: 400 }
      );
    }

    const saved = await savePaymentMethods(methods);
    return NextResponse.json({ success: true, methods: saved });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[PaymentMethods] Error al guardar métodos:", error);
    return NextResponse.json(
      { error: error.message || "No se pudieron guardar los métodos de pago." },
      { status: 500 }
    );
  }
}
