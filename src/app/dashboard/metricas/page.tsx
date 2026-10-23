import { prisma } from "@/lib/prisma";
import { BarChart3, TrendingUp, DollarSign, ShoppingBag, Clock, Store } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MetricasPage() {
  const orders = await prisma.order.findMany({
    include: { merchant: true },
  });

  const totalSalesBs = orders.reduce((acc, o) => acc + o.totalAmount, 0);
  const totalDeliveryFeesBs = orders.reduce((acc, o) => acc + o.deliveryFee, 0);
  const avgTicketBs = orders.length > 0 ? totalSalesBs / orders.length : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#101828]">Métricas y Ventas (Ivirgarzama)</h2>
        <p className="text-sm text-[#475467]">
          Rendimiento financiero y volumen de operaciones de Tropigo en Bolivianos (Bs.).
        </p>
      </div>

      {/* Grid de Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-[#EAECF0] shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">
              Volumen Total de Pedidos
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-[#101828]">{totalSalesBs.toFixed(2)} Bs.</p>
          <p className="text-xs text-emerald-700 font-medium">Facturación bruta acumulada</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#EAECF0] shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">
              Ingresos por Envíos (Tropigo)
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-blue-700">{totalDeliveryFeesBs.toFixed(2)} Bs.</p>
          <p className="text-xs text-[#667085]">Comisión neta de tarifas de despacho</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#EAECF0] shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">
              Ticket Promedio
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-purple-700">{avgTicketBs.toFixed(2)} Bs.</p>
          <p className="text-xs text-[#667085]">Promedio por comanda emitida</p>
        </div>
      </div>

      {/* Historial de Transacciones */}
      <div className="bg-white rounded-2xl border border-[#EAECF0] p-6 shadow-xs space-y-4">
        <h3 className="font-semibold text-sm text-[#101828]">Últimos Pedidos Facturados</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#EAECF0] text-[#667085] bg-[#F9FAFB]">
                <th className="py-2.5 px-3">Código</th>
                <th className="py-2.5 px-3">Comercio</th>
                <th className="py-2.5 px-3">Método de Pago</th>
                <th className="py-2.5 px-3">Envío (Bs.)</th>
                <th className="py-2.5 px-3 text-right">Total (Bs.)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAECF0]">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-[#F9FAFB]">
                  <td className="py-3 px-3 font-mono font-bold text-emerald-800">
                    {o.orderNumber}
                  </td>
                  <td className="py-3 px-3 text-[#101828]">
                    {o.merchant?.name || "Mandado Tropigo"}
                  </td>
                  <td className="py-3 px-3">
                    <span className="bg-[#F2F4F7] px-2 py-0.5 rounded text-[11px] font-medium">
                      {o.paymentMethod}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-[#667085]">{o.deliveryFee.toFixed(2)} Bs.</td>
                  <td className="py-3 px-3 text-right font-bold text-emerald-700">
                    {o.totalAmount.toFixed(2)} Bs.
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
