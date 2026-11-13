import { Sidebar } from "@/components/sidebar";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { MasterAssistantSwitch } from "./master-switch";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [business, agency, wpChannel, webChannel, pendingOrders, pendingHuman, session] =
    await Promise.all([
      prisma.businessProfile.findFirst(),
      prisma.agencyProfile.findFirst(),
      prisma.channel.findUnique({ where: { type: "whatsapp" } }),
      prisma.channel.findUnique({ where: { type: "webchat" } }),
      prisma.order.count({ where: { status: "RECIBIDO" } }),
      prisma.conversation.count({ where: { status: "HUMAN_TAKEOVER" } }),
      getSession(),
    ]);

  const isWpConnected = wpChannel?.status === "connected";
  const isWebConnected = webChannel?.status === "connected";

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      <Sidebar
        businessName={business?.name || "TropiGO Ivirgarzama"}
        pendingOrdersCount={pendingOrders}
        unreadCount={pendingHuman}
        userName={session?.name || "Operador Central"}
        userRole={session?.role || "ADMIN"}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-[#EAECF0] px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <h1 className="text-sm sm:text-base font-black text-[#101828]">
              {business?.name || "TropiGO Ivirgarzama"}
            </h1>
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 hidden sm:inline-block">
              Ivirgarzama (America/La_Paz • Bs.)
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Estado Canales */}
            <div className="hidden lg:flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#EAECF0] bg-[#FAFAFA] text-[#344054]">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isWpConnected ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                  }`}
                />
                <span className="font-bold text-[11px]">
                  WhatsApp: {isWpConnected ? "Conectado" : "Esperando QR"}
                </span>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#EAECF0] bg-[#FAFAFA] text-[#344054]">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-bold text-[11px]">Web: Activo</span>
              </div>
            </div>

            {/* Interruptor Maestro Asistente TropiBot */}
            <MasterAssistantSwitch
              initialEnabled={business?.assistantEnabled ?? true}
            />
          </div>
        </header>

        {/* Contenido Principal */}
        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
