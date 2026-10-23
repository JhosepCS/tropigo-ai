import { Sidebar } from "@/components/sidebar";
import { prisma } from "@/lib/prisma";
import { MasterAssistantSwitch } from "./master-switch";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const business = await prisma.businessProfile.findFirst();
  const agency = await prisma.agencyProfile.findFirst();
  const wpChannel = await prisma.channel.findUnique({ where: { type: "whatsapp" } });
  const webChannel = await prisma.channel.findUnique({ where: { type: "webchat" } });
  const pendingHuman = await prisma.conversation.count({
    where: { status: "human_takeover" },
  });

  const isWpConnected = wpChannel?.status === "connected";
  const isWebConnected = webChannel?.status === "connected";

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      <Sidebar
        agencyName={agency?.name || "Agencia Lumina"}
        pendingHumanCount={pendingHuman}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-[#EAECF0] px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-[#101828]">
              {business?.name || "Clínica Dental Lumen"}
            </h1>
            <span className="text-xs text-[#667085] bg-[#F2F4F7] px-2 py-0.5 rounded-md border border-[#EAECF0] hidden sm:inline-block">
              Gran Vía 42, Madrid (Europe/Madrid)
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Estado Canales */}
            <div className="hidden lg:flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#EAECF0] bg-[#FAFAFA] text-[#344054]">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isWpConnected ? "bg-emerald-500" : "bg-gray-400"
                  }`}
                />
                <span>WhatsApp: {isWpConnected ? wpChannel?.phone || "Conectado" : "Sin conectar"}</span>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#EAECF0] bg-[#FAFAFA] text-[#344054]">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isWebConnected ? "bg-emerald-500" : "bg-gray-400"
                  }`}
                />
                <span>Chat Web: {isWebConnected ? "Activo" : "Pausado"}</span>
              </div>
            </div>

            {/* Interruptor General Asistente encendido / en pausa */}
            <MasterAssistantSwitch initialEnabled={business?.assistantEnabled ?? true} />
          </div>
        </header>

        {/* Contenido Principal */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
