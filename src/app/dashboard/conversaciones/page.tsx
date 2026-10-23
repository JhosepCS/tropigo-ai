import { prisma } from "@/lib/prisma";
import { ConversacionesClient } from "./conversaciones-client";

export const dynamic = "force-dynamic";

export default async function ConversacionesPage() {
  const conversations = await prisma.conversation.findMany({
    include: {
      customer: true,
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#101828]">Bandeja de Conversaciones (WhatsApp & Web)</h2>
        <p className="text-sm text-[#475467]">
          Supervisa los chats en tiempo real. Si un cliente necesita atención especial, toma el control con un clic para pausar a TropiBot en esa conversación.
        </p>
      </div>

      <ConversacionesClient initialConversations={conversations as any} />
    </div>
  );
}
