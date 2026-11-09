import { prisma } from "@/lib/prisma";
import { PedidosClient } from "./pedidos-client";

export const dynamic = "force-dynamic";

export default async function PedidosPage() {
  const [orders, riders] = await Promise.all([
    prisma.order
      .findMany({
        include: {
          customer: true,
          merchant: true,
          assignedRider: true,
          deliveryZone: true,
          items: true,
          statusHistory: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      })
      .catch(() => []),
    prisma.rider
      .findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          phone: true,
          vehicleType: true,
          plateNumber: true,
          isAvailable: true,
        },
        orderBy: { name: "asc" },
      })
      .catch(() => []),
  ]);

  const serializedOrders = orders.map((order) => ({
    ...order,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    statusHistory: order.statusHistory.map((entry) => ({
      ...entry,
      createdAt: entry.createdAt.toISOString(),
    })),
  }));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-black text-[#101828]">
            Mesa de Pedidos WhatsApp
          </h2>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
            TropiGO AI • Ivirgarzama
          </span>
        </div>
        <p className="text-xs text-[#667085] mt-0.5">
          Pedidos reales registrados tras una cotización oficial y confirmación explícita del cliente.
          Gestiona preparación, despacho y entrega en Bolivianos (Bs.).
        </p>
      </div>

      <PedidosClient initialOrders={serializedOrders} riders={riders} />
    </div>
  );
}
