import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireMemoryAdmin } from "@/lib/memory/auth";
import { CustomerMemoryDetailClient } from "./customer-detail-client";

export const dynamic = "force-dynamic";

export default async function CustomerMemoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireMemoryAdmin();
  const { id } = await params;

  const customer = await prisma.customer
    .findUnique({
      where: { id },
      include: {
        memoryFacts: {
          orderBy: { updatedAt: "desc" },
        },
        conversationSummaries: {
          orderBy: { createdAt: "desc" },
          include: {
            conversation: {
              select: {
                id: true,
                channel: true,
                status: true,
                createdAt: true,
                lastMessageAt: true,
              },
            },
          },
        },
        conversations: {
          orderBy: { lastMessageAt: "desc" },
          take: 20,
          include: {
            messages: {
              orderBy: { createdAt: "asc" },
              take: 200,
            },
            summary: {
              select: {
                id: true,
                createdAt: true,
                messageCount: true,
              },
            },
          },
        },
        orders: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            orders: true,
            conversations: true,
            memoryFacts: true,
            conversationSummaries: true,
          },
        },
      },
    })
    .catch(() => null);

  if (!customer) {
    notFound();
  }

  const serialized = {
    ...customer,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
    memoryFacts: customer.memoryFacts.map((fact) => ({
      ...fact,
      createdAt: fact.createdAt.toISOString(),
      updatedAt: fact.updatedAt.toISOString(),
    })),
    conversationSummaries: customer.conversationSummaries.map((summary) => ({
      ...summary,
      createdAt: summary.createdAt.toISOString(),
      updatedAt: summary.updatedAt.toISOString(),
      periodStart: summary.periodStart?.toISOString() || null,
      periodEnd: summary.periodEnd?.toISOString() || null,
      conversation: summary.conversation
        ? {
            ...summary.conversation,
            createdAt: summary.conversation.createdAt.toISOString(),
            lastMessageAt: summary.conversation.lastMessageAt.toISOString(),
          }
        : null,
    })),
    conversations: customer.conversations.map((conversation) => ({
      ...conversation,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      lastMessageAt: conversation.lastMessageAt.toISOString(),
      summary: conversation.summary
        ? {
            ...conversation.summary,
            createdAt: conversation.summary.createdAt.toISOString(),
          }
        : null,
      messages: conversation.messages.map((message) => ({
        ...message,
        createdAt: message.createdAt.toISOString(),
      })),
    })),
    orders: customer.orders.map((order) => ({
      ...order,
      createdAt: order.createdAt.toISOString(),
    })),
  };

  return (
    <div className="space-y-6">
      <CustomerMemoryDetailClient customer={serialized} />
    </div>
  );
}
