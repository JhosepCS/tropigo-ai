import { Sidebar } from "@/components/sidebar";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pendingOrders = await prisma.order.count({
    where: { status: { in: ["RECIBIDO", "EN_PREPARACION", "EN_CAMINO"] } },
  });

  const wpConfig = await prisma.whatsAppConfig.findFirst();
  const business = await prisma.businessProfile.findFirst();

  const isWpConnected =
    wpConfig?.activeProvider === "META_CLOUD_API"
      ? Boolean(wpConfig.metaPhoneNumberId)
      : wpConfig?.baileysStatus === "CONNECTED";

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      <Sidebar ordersCount={pendingOrders} />

      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-[#EAECF0] px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-[#101828]">
              {business?.name || "Tropigo Delivery"}
            </h1>
            <span className="text-xs text-[#667085] bg-[#F2F4F7] px-2 py-0.5 rounded-md border border-[#EAECF0]">
              {business?.cityZone || "Ivirgarzama, Bolivia"}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Estado del Asistente */}
            <div className="flex items-center gap-2 text-xs font-medium bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>TropiBot IA Activo</span>
            </div>

            {/* Estado de WhatsApp */}
            <div className="flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-full border border-[#EAECF0] bg-white text-[#344054]">
              <span
                className={`w-2 h-2 rounded-full ${
                  isWpConnected ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              <span>
                WhatsApp: {wpConfig?.activeProvider === "META_CLOUD_API" ? "Meta API Oficial" : "Baileys QR"} (
                {isWpConnected ? "En Línea" : "Esperando QR"})
              </span>
            </div>
          </div>
        </header>

        {/* Contenido Principal */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
