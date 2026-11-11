import { NextRequest, NextResponse } from "next/server";
import {
  requireRole,
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/auth/rbac";
import { redeemRewardManually } from "@/lib/loyalty/service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(["SUPERADMIN", "ADMIN", "OPERATOR"]);
    const body = await req.json().catch(() => ({}));
    const customerId = String(body?.customerId || "").trim();
    const note = body?.note ? String(body.note) : undefined;

    if (!customerId) {
      return NextResponse.json(
        { error: "Falta el cliente cuyo premio se va a canjear." },
        { status: 400 }
      );
    }

    const result = await redeemRewardManually(customerId, session.userId, note);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    return NextResponse.json({ success: true, loyalty: result.summary });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[Loyalty] Error en /api/loyalty/redeem:", error);
    return NextResponse.json(
      { error: error.message || "No se pudo canjear el premio." },
      { status: 500 }
    );
  }
}
