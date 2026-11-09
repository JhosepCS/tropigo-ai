import { NextRequest, NextResponse } from "next/server";
import { deleteConversationSummary } from "@/lib/memory/conversation-summary";
import { requireMemoryAdmin } from "@/lib/memory/auth";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/rbac";

/**
 * DELETE /api/admin/customers/[id]/summaries/[summaryId]
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; summaryId: string }> }
) {
  try {
    const session = await requireMemoryAdmin();
    const { id, summaryId } = await params;

    const result = await deleteConversationSummary(id, summaryId, {
      generatedBy: "CRM",
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
    console.error("Error al eliminar resumen:", error);
    return NextResponse.json(
      { error: "No se pudo eliminar el resumen." },
      { status: 500 }
    );
  }
}
