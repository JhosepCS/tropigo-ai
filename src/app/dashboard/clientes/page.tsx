import { prisma } from "@/lib/prisma";
import { ClientesClient } from "./clientes-client";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const customers = await prisma.customer
    .findMany({
      include: {
        _count: {
          select: {
            orders: true,
            conversations: true,
            memoryFacts: true,
            conversationSummaries: true,
          },
        },
        memoryFacts: {
          orderBy: { updatedAt: "desc" },
          take: 3,
        },
        conversations: {
          orderBy: { lastMessageAt: "desc" },
          take: 1,
          select: {
            id: true,
            channel: true,
            status: true,
            lastMessageAt: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    })
    .catch(() => []);

  const serializedCustomers = customers.map((customer) => ({
    ...customer,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
    memoryFacts: customer.memoryFacts.map((fact) => ({
      ...fact,
      createdAt: fact.createdAt.toISOString(),
      updatedAt: fact.updatedAt.toISOString(),
    })),
    conversations: customer.conversations.map((conversation) => ({
      ...conversation,
      lastMessageAt: conversation.lastMessageAt.toISOString(),
    })),
  }));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-black text-[#101828]">
            Clientes & Memoria de WhatsApp
          </h2>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
            TropiGO AI • Ivirgarzama
          </span>
        </div>
        <p className="text-xs text-[#667085] mt-0.5">
          Perfiles reales identificados por su número de WhatsApp. La IA conserva
          preferencias, direcciones habituales y resúmenes de conversaciones anteriores,
          siempre aislados por cliente. Desde aquí puedes revisar, editar o eliminar esa memoria.
        </p>
      </div>

      <ClientesClient initialCustomers={serializedCustomers} />
    </div>
  );
}
