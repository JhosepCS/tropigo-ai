import { prisma } from "@/lib/prisma";
import { OrderBoard } from "./order-board";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const orders = await prisma.order.findMany({
    include: {
      customer: true,
      merchant: true,
      assignedRider: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const riders = await prisma.rider.findMany({
    where: { isActive: true },
  });

  // Métricas
  const totalOrders = orders.length;
  const activeOrders = orders.filter((o) =>
    ["RECIBIDO", "EN_PREPARACION", "EN_CAMINO"].includes(o.status)
  ).length;
  const totalSalesBs = orders
    .filter((o) => o.status === "ENTREGADO" || o.paymentStatus === "PAGADO_VERIFICADO")
    .reduce((acc, o) => acc + o.totalAmount, 0);

  return (
    <div className="space-y-6">
      {/* Encabezado y Métricas Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#101828]">Tablero de Despacho en Vivo (KDS)</h2>
          <p className="text-sm text-[#475467]">
            Monitorea los pedidos entrantes por WhatsApp en tiempo real, asigna motos y gestiona entregas.
          </p>
        </div>
      </div>

      {/* Grid de Métricas estilo Untitled UI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#EAECF0] shadow-xs">
          <p className="text-xs font-medium text-[#667085]">Pedidos Activos Ahora</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#101828]">{activeOrders}</span>
            <span className="text-xs font-medium bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
              En proceso
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#EAECF0] shadow-xs">
          <p className="text-xs font-medium text-[#667085]">Ventas Realizadas Hoy</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-700">{totalSalesBs.toFixed(2)} Bs.</span>
            <span className="text-xs font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
              +18% vs ayer
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#EAECF0] shadow-xs">
          <p className="text-xs font-medium text-[#667085]">Repartidores Disponibles</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#101828]">
              {riders.filter((r) => r.isAvailable).length} / {riders.length}
            </span>
            <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
              Motos activas
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#EAECF0] shadow-xs">
          <p className="text-xs font-medium text-[#667085]">Tiempo Promedio de Entrega</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#101828]">24 min</span>
            <span className="text-xs font-medium bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
              Ivirgarzama
            </span>
          </div>
        </div>
      </div>

      {/* Tablero Kanban Interactivo */}
      <OrderBoard initialOrders={orders as any} riders={riders as any} />
    </div>
  );
}
