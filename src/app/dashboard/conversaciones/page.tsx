import { prisma } from "@/lib/prisma";
import { ConversacionesClient } from "./conversaciones-client";

export const dynamic = "force-dynamic";

export default async function ConversacionesPage() {
  const conversations = await prisma.conversation.findMany({
    include: {
      contact: true,
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#101828]">Bandeja de Conversaciones</h2>
        <p className="text-sm text-[#475467]">
          Bandeja unificada para WhatsApp y Web. Supervisa las respuestas del asistente, revisa qué herramientas usó en cada mensaje o toma el control manual en cualquier momento.
        </p>
      </div>

      <ConversacionesClient initialConversations={conversations as any} />
    </div>
  );
}
