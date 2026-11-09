"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { OrderStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Package,
  Phone,
  MapPin,
  Store,
  Navigation,
  CheckCircle2,
  Clock,
  ExternalLink,
  DollarSign,
  AlertCircle,
} from "lucide-react";

export function RiderOrdersClient({
  initialOrders,
  completedOrders,
  riderId,
}: {
  initialOrders: any[];
  completedOrders: any[];
  riderId: string;
}) {
  const [activeOrders, setActiveOrders] = useState<any[]>(initialOrders);
  const [historyOrders, setHistoryOrders] = useState<any[]>(completedOrders);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch("/api/repartidor/update-order-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: newStatus, riderId }),
      });

      if (res.ok) {
        if (newStatus === "ENTREGADO") {
          const finished = activeOrders.find((o) => o.id === orderId);
          setActiveOrders((prev) => prev.filter((o) => o.id !== orderId));
          if (finished) {
            setHistoryOrders((prev) => [{ ...finished, status: "ENTREGADO" }, ...prev]);
          }
        } else {
          setActiveOrders((prev) =>
            prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
          );
        }
      } else {
        alert("No se pudo actualizar el estado. Inténtalo de nuevo.");
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión al actualizar el pedido.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner de Estado Operativo */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
            Turno de Reparto
          </span>
          <h2 className="text-lg font-black tracking-tight mt-1">
            Entregas Pendientes en Ivirgarzama
          </h2>
          <p className="text-xs text-emerald-100">
            {activeOrders.length === 0
              ? "No tienes pedidos en curso ahora mismo"
              : `Tienes ${activeOrders.length} pedido(s) asignado(s)`}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[11px] text-emerald-100">Tarifa de entrega urbana</p>
          <p className="text-base font-black">5.00 Bs. / pedido</p>
        </div>
      </div>

      {/* Lista de Pedidos Asignados Activos */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-emerald-600" />
          <span>Pedidos Activos para Entrega</span>
        </h3>

        {activeOrders.length === 0 ? (
          <EmptyState
            icon={<Package className="w-8 h-8 text-emerald-600" />}
            title="Sin pedidos asignados"
            description="La central de despacho de TropiGO te asignará las comandas listas de los restaurantes de Ivirgarzama."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeOrders.map((order) => {
              const isEnCamino = order.status === "EN_CAMINO";
              const isSubmitting = updatingId === order.id;
              const items = order.items && order.items.length > 0
                ? order.items
                : JSON.parse(order.itemsJson || "[]");

              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${order.deliveryAddressText}, Ivirgarzama, Bolivia`
              )}`;

              return (
                <Card key={order.id} className="border-emerald-200 shadow-xs hover:border-emerald-300 transition-all">
                  <CardHeader className="bg-slate-50 pb-3 flex flex-row items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase">
                        Orden de Pedido
                      </span>
                      <CardTitle className="text-base font-black text-slate-900">
                        {order.orderNumber}
                      </CardTitle>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </CardHeader>

                  <CardContent className="p-4 space-y-3.5 text-xs">
                    {/* 1. Punto de Recojo (Comercio) */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1">
                          <Store className="w-3 h-3 text-emerald-600" />
                          Recoger en:
                        </span>
                        {order.merchant?.phone && (
                          <a
                            href={`tel:${order.merchant.phone}`}
                            className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3" />
                            Llamar
                          </a>
                        )}
                      </div>
                      <p className="font-bold text-slate-900">
                        {order.merchant?.name || "Comercio Afiliado"}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {order.merchant?.address || "Av. Principal Ivirgarzama"}
                      </p>
                    </div>

                    {/* 2. Platos a Entregar */}
                    <div className="space-y-1 border-y border-slate-100 py-2">
                      <span className="text-[10px] font-bold uppercase text-slate-400">
                        Contenido del Paquete:
                      </span>
                      {items.map((it: any, idx: number) => (
                        <p key={idx} className="font-medium text-slate-800 flex justify-between">
                          <span>
                            {it.quantity}x {it.productName || it.name}
                          </span>
                          <span className="text-slate-500">
                            {((it.unitPrice || it.price || 0) * (it.quantity || 1)).toFixed(2)} Bs.
                          </span>
                        </p>
                      ))}
                    </div>

                    {/* 3. Punto de Entrega (Cliente) */}
                    <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-emerald-800 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-emerald-700" />
                          Entregar a:
                        </span>
                        {order.customer?.phone && (
                          <a
                            href={`tel:${order.customer.phone}`}
                            className="text-[11px] font-bold text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded-md hover:bg-emerald-200 flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3" />
                            Llamar Cliente
                          </a>
                        )}
                      </div>
                      <p className="font-black text-slate-900">
                        {order.customer?.name || "Cliente"}
                      </p>
                      <p className="text-[11px] text-slate-700 font-semibold">
                        {order.deliveryAddressText}
                      </p>
                      {order.referencePoint && (
                        <p className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                          Ref: {order.referencePoint}
                        </p>
                      )}
                    </div>

                    {/* 4. Cobro y Pago */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100/70 border border-slate-200 font-bold">
                      <div>
                        <span className="text-[10px] uppercase text-slate-500 block">
                          Método de Cobro
                        </span>
                        <span className="text-slate-900 flex items-center gap-1">
                          {order.paymentMethod === "EFECTIVO" ? "💵 Efectivo al entregar" : "📲 QR Pagado"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase text-slate-500 block">
                          Total a cobrar
                        </span>
                        <span className="text-sm font-black text-emerald-700">
                          {order.paymentMethod === "EFECTIVO"
                            ? `${order.totalAmount.toFixed(2)} Bs.`
                            : "0.00 Bs. (Ya pagado)"}
                        </span>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="flex flex-col gap-2 pt-0">
                    <div className="grid grid-cols-2 gap-2 w-full">
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                      >
                        <Navigation className="w-3.5 h-3.5 text-slate-600" />
                        <span>Abrir Maps</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </a>

                      {!isEnCamino ? (
                        <Button
                          variant="solar"
                          size="sm"
                          isLoading={isSubmitting}
                          onClick={() => handleUpdateStatus(order.id, "EN_CAMINO")}
                        >
                          🛵 En Camino
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          isLoading={isSubmitting}
                          onClick={() => handleUpdateStatus(order.id, "ENTREGADO")}
                          leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        >
                          Entregado
                        </Button>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Historial de Entregas Completadas Hoy */}
      {historyOrders.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Entregas Completadas Hoy ({historyOrders.length})</span>
          </h3>

          <div className="space-y-2">
            {historyOrders.map((order) => (
              <div
                key={order.id}
                className="p-3 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span>{order.orderNumber}</span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                      Entregado
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {order.customer?.name} • {order.deliveryAddressText}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-slate-900">
                    +{order.deliveryFee ? order.deliveryFee.toFixed(2) : "5.00"} Bs.
                  </span>
                  <p className="text-[10px] text-slate-400">Tarifa recibida</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
