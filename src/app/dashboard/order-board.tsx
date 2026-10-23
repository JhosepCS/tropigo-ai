"use client";

import { useState } from "react";
import {
  Clock,
  MapPin,
  Phone,
  Bike,
  Printer,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Utensils,
  Receipt,
  User,
} from "lucide-react";

interface OrderBoardProps {
  initialOrders: any[];
  riders: any[];
}

export function OrderBoard({ initialOrders, riders }: OrderBoardProps) {
  const [orders, setOrders] = useState<any[]>(initialOrders);
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<any | null>(null);

  const columns = [
    {
      id: "RECIBIDO",
      title: "Recibidos (Nuevos)",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      countColor: "bg-blue-100 text-blue-800",
      nextStatus: "EN_PREPARACION",
      nextActionLabel: "Aceptar y Preparar",
    },
    {
      id: "EN_PREPARACION",
      title: "En Preparación",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      countColor: "bg-amber-100 text-amber-800",
      nextStatus: "EN_CAMINO",
      nextActionLabel: "Despachar a Moto",
    },
    {
      id: "EN_CAMINO",
      title: "En Camino (Delivery)",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      countColor: "bg-purple-100 text-purple-800",
      nextStatus: "ENTREGADO",
      nextActionLabel: "Marcar Entregado",
    },
    {
      id: "ENTREGADO",
      title: "Entregados",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      countColor: "bg-emerald-100 text-emerald-800",
      nextStatus: null,
      nextActionLabel: null,
    },
  ];

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    // Actualización optimista local
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
    );

    try {
      await fetch("/api/orders/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: nextStatus }),
      });
    } catch (e) {
      console.error("Error al actualizar estado del pedido:", e);
    }
  };

  const handleAssignRider = async (orderId: string, riderId: string) => {
    const selectedRider = riders.find((r) => r.id === riderId);
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, assignedRiderId: riderId, assignedRider: selectedRider }
          : o
      )
    );

    try {
      await fetch("/api/orders/assign-rider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, riderId }),
      });
    } catch (e) {
      console.error("Error al asignar repartidor:", e);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tablero Kanban */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {columns.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.id);

          return (
            <div
              key={col.id}
              className="bg-[#F8F9FA] rounded-xl border border-[#EAECF0] p-4 flex flex-col min-h-[500px]"
            >
              {/* Header Columna */}
              <div className="flex items-center justify-between pb-3 border-b border-[#EAECF0]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-[#101828]">
                    {col.title}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${col.countColor}`}
                  >
                    {colOrders.length}
                  </span>
                </div>
              </div>

              {/* Lista de Pedidos */}
              <div className="mt-3 space-y-3 flex-1">
                {colOrders.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-xs text-[#98A2B3] border border-dashed border-[#EAECF0] rounded-lg">
                    Sin pedidos en esta etapa
                  </div>
                ) : (
                  colOrders.map((order) => {
                    let items: any[] = [];
                    try {
                      items = JSON.parse(order.itemsJson);
                    } catch (e) {
                      items = [];
                    }

                    return (
                      <div
                        key={order.id}
                        className="bg-white rounded-xl border border-[#EAECF0] p-4 shadow-xs hover:border-[#D0D5DD] transition-all flex flex-col justify-between gap-3"
                      >
                        {/* Cabecera Tarjeta: Número y Tiempo */}
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-sm text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            {order.orderNumber}
                          </span>
                          <span className="text-[11px] text-[#667085] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(order.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        {/* Comercio y Cliente */}
                        <div className="space-y-1">
                          {order.merchant && (
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#101828]">
                              <Utensils className="w-3.5 h-3.5 text-amber-600" />
                              <span className="truncate">{order.merchant.name}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 text-xs text-[#475467]">
                            <User className="w-3.5 h-3.5 text-[#667085]" />
                            <span className="font-medium text-[#101828]">
                              {order.customer?.name || "Cliente WhatsApp"}
                            </span>
                          </div>

                          <div className="flex items-start gap-1.5 text-xs text-[#667085]">
                            <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">
                              {order.deliveryAddressText}
                            </span>
                          </div>
                        </div>

                        {/* Desglose de Productos */}
                        <div className="bg-[#F9FAFB] p-2.5 rounded-lg border border-[#F2F4F7] text-xs space-y-1">
                          {items.map((it, idx) => (
                            <div
                              key={idx}
                              className="flex items-baseline justify-between text-[#344054]"
                            >
                              <span>
                                <strong className="text-emerald-700">
                                  {it.quantity}x
                                </strong>{" "}
                                {it.name}
                              </span>
                              <span className="text-[#667085] ml-2">
                                {(it.unitPrice * it.quantity).toFixed(1)} Bs.
                              </span>
                            </div>
                          ))}

                          <div className="pt-2 border-t border-[#EAECF0] flex justify-between font-bold text-[#101828] text-xs">
                            <span>Total (+{order.deliveryFee} Bs. envío):</span>
                            <span className="text-emerald-700">
                              {order.totalAmount.toFixed(2)} Bs.
                            </span>
                          </div>
                        </div>

                        {/* Método de Pago y Estado */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="bg-[#F2F4F7] text-[#344054] px-2 py-0.5 rounded-md font-medium text-[11px] border border-[#EAECF0]">
                            {order.paymentMethod}
                          </span>
                          <span
                            className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                              order.paymentStatus === "PAGADO_VERIFICADO"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {order.paymentStatus === "PAGADO_VERIFICADO"
                              ? "Pagado"
                              : "Cobrar al entregar"}
                          </span>
                        </div>

                        {/* Asignación de Repartidor */}
                        {col.id !== "ENTREGADO" && (
                          <div className="pt-2 border-t border-[#EAECF0]">
                            <label className="text-[11px] font-medium text-[#667085] block mb-1">
                              Repartidor asignado:
                            </label>
                            <select
                              value={order.assignedRiderId || ""}
                              onChange={(e) =>
                                handleAssignRider(order.id, e.target.value)
                              }
                              className="w-full text-xs bg-white border border-[#D0D5DD] rounded-lg px-2 py-1.5 text-[#101828] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            >
                              <option value="">Seleccionar moto...</option>
                              {riders.map((r) => (
                                <option key={r.id} value={r.id}>
                                  🛵 {r.name} ({r.plateNumber}) -{" "}
                                  {r.isAvailable ? "Libre" : "En ruta"}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Botones de Acción */}
                        <div className="flex items-center gap-2 pt-2">
                          <button
                            onClick={() => setSelectedOrderForPrint(order)}
                            title="Imprimir Comanda Térmica"
                            className="p-1.5 border border-[#D0D5DD] rounded-lg text-[#667085] hover:text-[#101828] hover:bg-[#F9FAFB] transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {col.nextStatus && (
                            <button
                              onClick={() =>
                                handleUpdateStatus(order.id, col.nextStatus!)
                              }
                              className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors shadow-xs"
                            >
                              <span>{col.nextActionLabel}</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Impresión de Comanda Térmica */}
      {selectedOrderForPrint && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-[#EAECF0] space-y-4 font-mono text-xs">
            <div className="text-center border-b border-dashed border-[#EAECF0] pb-3">
              <h3 className="font-bold text-base">TROPIGO DELIVERY</h3>
              <p className="text-[11px] text-[#667085]">Ivirgarzama - Cochabamba</p>
              <p className="text-[11px] text-[#667085]">WhatsApp: +591 74389012</p>
              <p className="font-bold text-sm mt-1">
                ORDEN: {selectedOrderForPrint.orderNumber}
              </p>
              <p className="text-[10px] text-[#98A2B3]">
                {new Date(selectedOrderForPrint.createdAt).toLocaleString("es-BO")}
              </p>
            </div>

            <div className="space-y-1">
              <p>
                <strong>Cliente:</strong>{" "}
                {selectedOrderForPrint.customer?.name || "Cliente WhatsApp"}
              </p>
              <p>
                <strong>Teléfono:</strong> {selectedOrderForPrint.customer?.phone}
              </p>
              <p>
                <strong>Dirección:</strong>{" "}
                {selectedOrderForPrint.deliveryAddressText}
              </p>
              {selectedOrderForPrint.assignedRider && (
                <p>
                  <strong>Moto:</strong>{" "}
                  {selectedOrderForPrint.assignedRider.name} (
                  {selectedOrderForPrint.assignedRider.plateNumber})
                </p>
              )}
            </div>

            <div className="border-t border-b border-dashed border-[#EAECF0] py-2 space-y-1">
              {JSON.parse(selectedOrderForPrint.itemsJson || "[]").map(
                (it: any, i: number) => (
                  <div key={i} className="flex justify-between">
                    <span>
                      {it.quantity}x {it.name}
                    </span>
                    <span>{(it.unitPrice * it.quantity).toFixed(2)} Bs.</span>
                  </div>
                )
              )}
            </div>

            <div className="space-y-1 text-right">
              <p>
                Subtotal:{" "}
                {(
                  selectedOrderForPrint.totalAmount -
                  selectedOrderForPrint.deliveryFee
                ).toFixed(2)}{" "}
                Bs.
              </p>
              <p>Envío: {selectedOrderForPrint.deliveryFee.toFixed(2)} Bs.</p>
              <p className="font-bold text-sm text-emerald-700">
                TOTAL: {selectedOrderForPrint.totalAmount.toFixed(2)} Bs.
              </p>
              <p className="text-[11px]">
                Pago: {selectedOrderForPrint.paymentMethod} (
                {selectedOrderForPrint.paymentStatus})
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSelectedOrderForPrint(null)}
                className="flex-1 py-2 border border-[#D0D5DD] rounded-lg text-[#344054] font-sans font-medium"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  window.print();
                  setSelectedOrderForPrint(null);
                }}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-sans font-semibold"
              >
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
