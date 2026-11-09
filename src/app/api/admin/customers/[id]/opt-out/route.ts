import { NextRequest, NextResponse } from "next/server";
import { setCustomerMemoryOptOut } from "@/lib/memory/customer-memory";
import { requireMemoryAdmin } from "@/lib/memory/auth";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/rbac";

/**
 * PATCH /api/admin/customers/[id]/opt-out
 * Activa o desactiva la memoria persistente para un cliente concreto.
 * Al desactivarla, la IA deja de leer y de escribir memoria para él.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireMemoryAdmin();
    const { id } = await params;
    const body = await req.json();

    if (typeof body?.memoryOptOut !== "boolean") {
      return NextResponse.json(
        { error: "El campo memoryOptOut debe ser booleano." },
        { status: 400 }
      );
    }

    const result = await setCustomerMemoryOptOut(id, body.memoryOptOut, {
      source: "CRM",
      actorUserId: session.userId,
      ignoreOptOut: true,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error al cambiar opt-out de memoria:", error);
    return NextResponse.json(
      { error: "No se pudo cambiar el estado de la memoria." },
      { status: 500 }
    );
  }
}
