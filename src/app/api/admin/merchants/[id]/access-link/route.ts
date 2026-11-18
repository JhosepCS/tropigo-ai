import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireRole,
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/auth/rbac";
import {
  ensureMerchantAccessToken,
  merchantAccessUrl,
  regenerateMerchantAccessToken,
} from "@/lib/access/tokens";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/merchants/[id]/access-link
 * Devuelve el enlace de cocina del comercio. Con regenerate=true revoca el
 * anterior y crea uno nuevo. Solo administración y operación.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["SUPERADMIN", "ADMIN", "OPERATOR"]);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const regenerate = Boolean(body?.regenerate);

    const merchant = await prisma.merchant.findUnique({
      where: { id },
      select: { id: true, name: true, accessToken: true },
    });
    if (!merchant) {
      return NextResponse.json(
        { error: "Comercio no encontrado." },
        { status: 404 }
      );
    }

    const token = regenerate
      ? await regenerateMerchantAccessToken(id)
      : merchant.accessToken || (await ensureMerchantAccessToken(id));

    if (!token) {
      return NextResponse.json(
        { error: "No se pudo generar el enlace." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      accessUrl: merchantAccessUrl(token),
    });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[AdminMerchantAccessLink] Error:", error);
    return NextResponse.json(
      { error: "No se pudo generar el enlace del comercio." },
      { status: 500 }
    );
  }
}
