import React from "react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DollarSign,
  TrendingUp,
  Package,
  Navigation,
  Sparkles,
  Calendar,
  Wallet,
  CheckCircle2,
  Bike,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RiderGananciasPage() {
  const session = await getSession();

  let rider = null;
  if (session?.userId) {
    rider = await prisma.rider.findFirst({
      where: {
        OR: [
          { userId: session.userId },
          { id: session.riderId },
        ],
      },
    });
  }

  if (!rider && ["SUPERADMIN", "ADMIN", "OPERATOR"].includes(session?.role || "")) {
    rider = await prisma.rider.findFirst({ where: { isActive: true } });
  }

  if (!rider) {
    return (
      <EmptyState
        icon={<Bike className="w-8 h-8 text-slate-400" />}
        title="Sin perfil de conductor activo"
        description="No se encontraron registros de liquidaciones para tu usuario."
      />
    );
  }

  // Filtrado estricto por el ID del repartidor autenticado
  const [completedOrders, completedRides] = await Promise.all([
    prisma.order.findMany({
      where: {
        assignedRiderId: rider.id,
        status: "ENTREGADO",
      },
    }),
    prisma.rideTrip.findMany({
      where: {
        assignedRiderId: rider.id,
        status: "FINALIZADO",
      },
    }),
  ]);

  const ordersEarnings = completedOrders.reduce(
    (acc, o) => acc + (o.deliveryFee || 5.0),
    0
  );
  const ridesEarnings = completedRides.reduce(
    (acc, r) => acc + (r.fareAmount || 4.0),
    0
  );
  const totalEarnings = ordersEarnings + ridesEarnings;

  return (
    <div className="space-y-6">
      {/* Resumen Principal de Ganancias */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-emerald-950 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-10">
          <Wallet className="w-32 h-32" />
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-800">
              Cierre Diario en Efectivo & QR
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Hoy en Ivirgarzama
            </span>
          </div>

          <div>
            <p className="text-xs text-slate-300 font-medium">Ganancia Total Acumulada</p>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
              {totalEarnings.toFixed(2)} <span className="text-emerald-400 text-xl font-bold">Bs.</span>
            </h1>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] text-slate-400 block font-semibold">
                Por Entregas
              </span>
              <span className="text-sm font-bold text-emerald-400">
                {ordersEarnings.toFixed(2)} Bs.
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {completedOrders.length} pedidos
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] text-slate-400 block font-semibold">
                Por Carreras
              </span>
              <span className="text-sm font-bold text-amber-400">
                {ridesEarnings.toFixed(2)} Bs.
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {completedRides.length} viajes
              </p>
            </div>

            <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] text-slate-400 block font-semibold">
                Total Servicios
              </span>
              <span className="text-sm font-bold text-white">
                {completedOrders.length + completedRides.length}
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">
                100% completados
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tarjeta Promoción Lanzamiento 0 Bs. Comisión */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-black text-amber-950">
            Campaña TropiGO Trópico — 0% de Comisión de Lanzamiento
          </p>
          <p className="text-amber-800">
            Durante la etapa de arranque en Ivirgarzama y el Trópico, el 100% de la tarifa de delivery (5 Bs.) y de carrera (4-5 Bs.) va directamente a tu bolsillo. No se te descuenta ningún porcentaje por el uso de la app.
          </p>
        </div>
      </div>

      {/* Detalle de Movimientos */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Desglose por Servicio Realizado</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          {completedOrders.length === 0 && completedRides.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">
              Aún no tienes servicios completados en esta jornada. Cuando entregues un pedido o finalices una carrera, tus ingresos se sumarán automáticamente aquí.
            </p>
          ) : (
            <div className="space-y-2">
              {completedOrders.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-emerald-100 text-emerald-800">
                      <Package className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <p className="font-bold text-slate-900">{o.orderNumber}</p>
                      <p className="text-[10px] text-slate-500">
                        Delivery urbano • {o.deliveryAddressText}
                      </p>
                    </div>
                  </div>
                  <span className="font-black text-emerald-700">
                    +{(o.deliveryFee || 5.0).toFixed(2)} Bs.
                  </span>
                </div>
              ))}

              {completedRides.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-amber-100 text-amber-800">
                      <Navigation className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <p className="font-bold text-slate-900">{r.tripNumber}</p>
                      <p className="text-[10px] text-slate-500">
                        {r.originAddress} ➔ {r.destinationAddress}
                      </p>
                    </div>
                  </div>
                  <span className="font-black text-amber-700">
                    +{(r.fareAmount || 4.0).toFixed(2)} Bs.
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
