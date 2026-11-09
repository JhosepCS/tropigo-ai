import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  clearCustomerSummaries,
  listConversationSummaries,
  summarizeConversation,
} from "@/lib/memory/conversation-summary";
import { requireMemoryAdmin } from "@/lib/memory/auth";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/customers/[id]/summaries
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireMemoryAdmin();
    const { id } = await params;

    const summaries = await listConversationSummaries(id);
    return NextResponse.json({ success: true, summaries });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error al listar resúmenes:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar los resúmenes." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/customers/[id]/summaries
 * Genera (o regenera) el resumen de una conversación del cliente.
 * La conversación debe pertenecer al cliente de la ruta.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireMemoryAdmin();
    const { id } = await params;
    const body = await req.json();
    const conversationId = String(body?.conversationId || "").trim();

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId es requerido." },
        { status: 400 }
      );
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, customerId: id },
      select: { id: true },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "La conversación no pertenece a este cliente." },
        { status: 404 }
      );
    }

    const result = await summarizeConversation(conversationId, {
      generatedBy: "CRM",
      force: Boolean(body?.force),
      actorUserId: session.userId,
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
    console.error("Error al generar resumen:", error);
    return NextResponse.json(
      { error: "No se pudo generar el resumen." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/customers/[id]/summaries
 * Borra todos los resúmenes históricos del cliente.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireMemoryAdmin();
    const { id } = await params;

    const result = await clearCustomerSummaries(id, {
      generatedBy: "CRM",
      actorUserId: session.userId,
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
    console.error("Error al borrar resúmenes:", error);
    return NextResponse.json(
      { error: "No se pudieron borrar los resúmenes." },
      { status: 500 }
    );
  }
}
