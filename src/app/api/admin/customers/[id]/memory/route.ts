import { NextRequest, NextResponse } from "next/server";
import {
  clearCustomerMemory,
  getCustomerMemorySnapshot,
  upsertCustomerMemoryFact,
} from "@/lib/memory/customer-memory";
import { requireMemoryAdmin } from "@/lib/memory/auth";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/customers/[id]/memory
 * Devuelve únicamente la memoria del cliente indicado.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireMemoryAdmin();
    const { id } = await params;

    const snapshot = await getCustomerMemorySnapshot(id);
    if (!snapshot.customer) {
      return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ success: true, ...snapshot });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error al obtener memoria del cliente:", error);
    return NextResponse.json(
      { error: "No se pudo cargar la memoria del cliente." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/customers/[id]/memory
 * Crea o actualiza un dato de memoria desde el CRM.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireMemoryAdmin();
    const { id } = await params;
    const body = await req.json();

    const result = await upsertCustomerMemoryFact(
      id,
      {
        category: String(body?.category || ""),
        key: String(body?.key || ""),
        value: String(body?.value || ""),
      },
      {
        source: "CRM",
        actorUserId: session.userId,
        ignoreOptOut: false,
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
    console.error("Error al guardar memoria del cliente:", error);
    return NextResponse.json(
      { error: "No se pudo guardar el dato de memoria." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/customers/[id]/memory
 * Borra toda la memoria estructurada del cliente. No borra pedidos ni
 * conversaciones; esas entidades tienen su propio ciclo de vida.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireMemoryAdmin();
    const { id } = await params;

    const result = await clearCustomerMemory(id, {
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
    console.error("Error al borrar memoria del cliente:", error);
    return NextResponse.json(
      { error: "No se pudo borrar la memoria del cliente." },
      { status: 500 }
    );
  }
}
