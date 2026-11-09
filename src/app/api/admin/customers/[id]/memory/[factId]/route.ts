import { NextRequest, NextResponse } from "next/server";
import {
  deleteCustomerMemoryFact,
  updateCustomerMemoryFact,
} from "@/lib/memory/customer-memory";
import { requireMemoryAdmin } from "@/lib/memory/auth";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/rbac";

/**
 * PATCH /api/admin/customers/[id]/memory/[factId]
 * Edita un dato de memoria existente. El customerId de la ruta y el de la
 * fila deben coincidir; nunca se permite mover memoria entre clientes.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; factId: string }> }
) {
  try {
    const session = await requireMemoryAdmin();
    const { id, factId } = await params;
    const body = await req.json();

    const result = await updateCustomerMemoryFact(
      id,
      factId,
      {
        category: body?.category,
        key: body?.key,
        value: body?.value,
      },
      {
        source: "CRM",
        actorUserId: session.userId,
      }
    );

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
    console.error("Error al editar memoria del cliente:", error);
    return NextResponse.json(
      { error: "No se pudo editar el dato de memoria." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/customers/[id]/memory/[factId]
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; factId: string }> }
) {
  try {
    const session = await requireMemoryAdmin();
    const { id, factId } = await params;

    const result = await deleteCustomerMemoryFact(id, factId, {
      source: "CRM",
      actorUserId: session.userId,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error al eliminar memoria del cliente:", error);
    return NextResponse.json(
      { error: "No se pudo eliminar el dato de memoria." },
      { status: 500 }
    );
  }
}
