import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { PageGuide } from "@/components/dashboard/page-guide";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [business, wpChannel, webChannel, pendingOrders, pendingHuman, session] =
    await Promise.all([
      prisma.businessProfile.findFirst(),
      prisma.channel.findUnique({ where: { type: "whatsapp" } }),
      prisma.channel.findUnique({ where: { type: "webchat" } }),
      prisma.order.count({ where: { status: "RECIBIDO" } }),
      prisma.conversation.count({ where: { status: "HUMAN_TAKEOVER" } }),
      getSession(),
    ]);

  const isWpConnected = wpChannel?.status === "connected";
  const isWebConnected = webChannel?.status === "connected";
  const businessName = business?.name || "TropiGO Ivirgarzama";

  return (
    <div className="flex h-dvh overflow-hidden bg-[#F7F4F9] text-[#1E1523] transition-colors duration-200 dark:bg-[#140D17] dark:text-slate-100">
      <Sidebar
        businessName={businessName}
        pendingOrdersCount={pendingOrders}
        unreadCount={pendingHuman}
        userName={session?.name || "Operador Central"}
        userRole={session?.role || "ADMIN"}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
        <Topbar
          businessName={businessName}
          isWpConnected={isWpConnected}
          isWebConnected={isWebConnected}
          initialAssistantEnabled={business?.assistantEnabled ?? true}
        />

        <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-5 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <PageGuide />
          {children}
        </main>
      </div>
    </div>
  );
}
