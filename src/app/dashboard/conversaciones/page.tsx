import { prisma } from "@/lib/prisma";
import { ConversacionesClient } from "./conversaciones-client";

export const dynamic = "force-dynamic";

export default async function ConversacionesPage() {
  // Carga inicial ligera: solo el último mensaje de cada chat. El historial
  // completo se pide aparte para la conversación abierta.
  const conversations = await prisma.conversation.findMany({
    include: {
      customer: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: { select: { messages: true } },
    },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
  });

  const initialConversations = conversations.map((c) => {
    const last = c.messages[0] || null;
    return {
      id: c.id,
      status: c.status,
      channel: c.channel,
      lastMessageAt: c.lastMessageAt.toISOString(),
      messageCount: c._count.messages,
      customer: c.customer
        ? {
            id: c.customer.id,
            name: c.customer.name || `Cliente (+${c.customer.phone})`,
            phone: c.customer.phone,
            address: c.customer.defaultAddress || "",
            zone: c.customer.referencePoint || "",
          }
        : null,
      lastMessage: last
        ? {
            sender: last.sender.toUpperCase(),
            content: last.content,
            mediaType: last.mediaType || "text",
            createdAt: last.createdAt.toISOString(),
          }
        : null,
    };
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h2 className="text-lg font-black text-[#101828]">
            Bandeja de Conversaciones
          </h2>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
            WhatsApp + Web
          </span>
          <span className="hidden text-[11px] text-[#667085] sm:inline">
            TropiBot responde solo y tú intervienes cuando haga falta.
          </span>
        </div>
      </div>

      <ConversacionesClient initialConversations={initialConversations} />
    </div>
  );
}
