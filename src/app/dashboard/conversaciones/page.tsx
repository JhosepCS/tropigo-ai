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
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-black text-[#101828]">
            Bandeja Unificada de WhatsApp & Web
          </h2>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
            TropiBot + Operadores
          </span>
        </div>
        <p className="text-xs text-[#667085] mt-0.5">
          Supervisa en vivo los pedidos y carreras de los clientes de Ivirgarzama, toma el control manual cuando sea necesario o devuelve la atención a TropiBot.
        </p>
      </div>

      <ConversacionesClient initialConversations={conversations as any} />
    </div>
  );
}
