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
  Plus,
  Utensils,
  Receipt,
  User,
  DollarSign,
  QrCode,
  Navigation,
} from "lucide-react";

interface OrderBoardProps {
  initialOrders: any[];
  riders: any[];
  merchants: any[];
}

export function OrderBoard({
  initialOrders,
  riders,
  merchants,
}: OrderBoardProps) {
  const [orders, setOrders] = useState<any[]>(initialOrders);
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<any | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Formulario Manual
  const [manualCustomerName, setManualCustomerName] = useState("");
  const [manualCustomerPhone, setManualCustomerPhone] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [manualReference, setManualReference] = useState("");
  const [manualMerchantId, setManualMerchantId] = useState(merchants[0]?.id || "");
  const [manualDishName, setManualDishName] = useState("Cuarto de Pollo a la Broaster");
  const [manualDishQty, setManualDishQty] = useState(1);
  const [manualDishPrice, setManualDishPrice] = useState(18.0);
  const [manualPaymentMethod, setManualPaymentMethod] = useState<"EFECTIVO" | "QR_BANCO">("EFECTIVO");
  const [isCreatingManual, setIsCreatingManual] = useState(false);

  const columns = [
    {
      id: "RECIBIDO",
      title: "1. Recibidos (Nuevos)",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      countColor: "bg-blue-100 text-blue-800",
      nextStatus: "EN_PREPARACION",
      nextActionLabel: "Aceptar a Cocina",
    },
    {
      id: "EN_PREPARACION",
      title: "2. En Preparación",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      countColor: "bg-amber-100 text-amber-800",
      nextStatus: "EN_CAMINO",
      nextActionLabel: "Despachar a Moto",
    },
    {
      id: "EN_CAMINO",
      title: "3. En Camino (Delivery)",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      countColor: "bg-purple-100 text-purple-800",
      nextStatus: "ENTREGADO",
      nextActionLabel: "Marcar Entregado",
    },
    {
      id: "ENTREGADO",
      title: "4. Entregados",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      countColor: "bg-emerald-100 text-emerald-800",
      nextStatus: null,
      nextActionLabel: null,
    },
  ];

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
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
          ? { ...o, assignedRiderId: riderId, assignedRider: selectedRider, status: "EN_CAMINO" }
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

  const handleCreateManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCustomerPhone || !manualAddress) return;

    setIsCreatingManual(true);
    try {
      const subtotal = manualDishQty * manualDishPrice;
      const deliveryFee = 5.0;
      const totalAmount = subtotal + deliveryFee;

      const res = await fetch("/api/public/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: manualCustomerName || "Cliente Telefónico",
          customerPhone: manualCustomerPhone,
          deliveryAddress: manualAddress,
          referencePoint: manualReference,
          paymentMethod: manualPaymentMethod,
          items: [
            {
              name: manualDishName,
              quantity: manualDishQty,
              unitPrice: manualDishPrice,
            },
          ],
          subtotal,
          deliveryFee,
          totalAmount,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Agregar a la vista local
        const newOrder = {
          id: data.orderId,
          orderNumber: data.orderNumber,
          customer: { name: manualCustomerName, phone: manualCustomerPhone },
          deliveryAddressText: manualAddress,
          referencePoint: manualReference,
          itemsJson: JSON.stringify([
            {
              name: manualDishName,
              quantity: manualDishQty,
              unitPrice: manualDishPrice,
            },
          ]),
          subtotal,
          deliveryFee,
          totalAmount,
          paymentMethod: manualPaymentMethod,
          paymentStatus: "PENDIENTE",
          status: "RECIBIDO",
          createdAt: new Date().toISOString(),
        };
        setOrders((prev) => [newOrder, ...prev]);
        setIsManualModalOpen(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingManual(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Botón Acción Superior */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-[#101828]">
            Tablero KDS de Despacho en Vivo
          </h3>
          <p className="text-xs text-[#667085]">
            Administra pedidos entrantes de WhatsApp y Web, asigna motos y gestiona entregas.
          </p>
        </div>

        <button
          onClick={() => setIsManualModalOpen(true)}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Pedido Manual</span>
        </button>
      </div>

      {/* Tablero Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {columns.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.id);

          return (
            <div
              key={col.id}
              className="bg-[#F8F9FA] rounded-2xl border border-[#EAECF0] p-4 flex flex-col min-h-[550px]"
            >
              {/* Header Columna */}
              <div className="flex items-center justify-between pb-3 border-b border-[#EAECF0]">
                <span className="font-bold text-xs text-[#101828]">
                  {col.title}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-black ${col.countColor}`}
                >
                  {colOrders.length}
                </span>
              </div>

              {/* Lista de Pedidos */}
              <div className="mt-3 space-y-3 flex-1">
                {colOrders.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-xs text-[#98A2B3] border border-dashed border-[#EAECF0] rounded-xl">
                    Sin pedidos aquí
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
                        className="bg-white rounded-xl border border-[#EAECF0] p-3.5 shadow-2xs hover:border-[#D0D5DD] transition-all flex flex-col justify-between gap-3 text-xs"
                      >
                        {/* Cabecera Tarjeta: Número y Tiempo */}
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-black text-xs text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {order.orderNumber}
                          </span>
                          <span className="text-[10px] text-[#667085] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#98A2B3]" />
                            <span>
                              {new Date(order.createdAt).toLocaleTimeString("es-BO", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </span>
                        </div>

                        {/* Cliente y Dirección */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-[#101828]">
                            <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate">
                              {order.customer?.name || "Cliente WhatsApp"}
                            </span>
                          </div>
                          <div className="flex items-start gap-1.5 text-[11px] text-[#475467]">
                            <MapPin className="w-3.5 h-3.5 text-[#98A2B3] shrink-0 mt-0.5" />
                            <span className="line-clamp-2">
                              {order.deliveryAddressText}
                            </span>
                          </div>
                          {order.referencePoint && (
                            <p className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                              Ref: {order.referencePoint}
                            </p>
                          )}
                        </div>

                        {/* Lista de Ítems */}
                        <div className="p-2 bg-[#F8F9FA] rounded-lg space-y-1 border border-[#EAECF0]/60">
                          {items.map((it, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-[11px]"
                            >
                              <span className="font-medium text-[#344054] truncate">
                                <strong>{it.quantity}x</strong> {it.name}
                              </span>
                              <span className="text-emerald-700 font-bold whitespace-nowrap">
                                {(it.unitPrice * it.quantity).toFixed(2)} Bs.
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Total y Método de Pago */}
                        <div className="flex items-center justify-between pt-1 border-t border-[#EAECF0]">
                          <div className="flex items-center gap-1 text-[10px] text-[#667085]">
                            {order.paymentMethod === "QR_BANCO" ? (
                              <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-bold border border-purple-200">
                                📲 QR Simple
                              </span>
                            ) : (
                              <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded font-bold border border-emerald-200">
                                💵 Efectivo
                              </span>
                            )}
                          </div>
                          <span className="font-black text-sm text-[#101828]">
                            {order.totalAmount.toFixed(2)} Bs.
                          </span>
                        </div>

                        {/* Asignación de Repartidor */}
                        <div className="space-y-1 pt-1">
                          <label className="text-[10px] font-bold text-[#667085] flex items-center gap-1">
                            <Bike className="w-3 h-3 text-emerald-600" />
                            <span>Repartidor asignado:</span>
                          </label>
                          <select
                            value={order.assignedRiderId || ""}
                            onChange={(e) =>
                              handleAssignRider(order.id, e.target.value)
                            }
                            className="w-full text-[11px] bg-[#F2F4F7] border border-[#D0D5DD] rounded-lg px-2 py-1 text-[#101828] focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                          >
                            <option value="">-- Sin moto asignada --</option>
                            {riders.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name} ({r.vehicleType} - {r.plateNumber})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Acciones de la Tarjeta */}
                        <div className="flex items-center gap-1.5 pt-2">
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
                              className="flex-1 flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-1.5 px-2.5 rounded-lg transition-colors shadow-2xs"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-2xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-[#EAECF0] space-y-4 font-mono text-xs">
            <div className="text-center border-b border-dashed border-[#EAECF0] pb-3">
              <h3 className="font-black text-base tracking-tight">TROPIGO DELIVERY</h3>
              <p className="text-[11px] text-[#667085]">Ivirgarzama — Cochabamba, Bolivia</p>
              <p className="text-[11px] text-[#667085]">Central WhatsApp: +591 74389012</p>
              <p className="font-black text-sm mt-1 text-emerald-800">
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
              {selectedOrderForPrint.referencePoint && (
                <p>
                  <strong>Ref:</strong> {selectedOrderForPrint.referencePoint}
                </p>
              )}
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
              <p className="font-black text-sm text-emerald-700">
                TOTAL: {selectedOrderForPrint.totalAmount.toFixed(2)} Bs.
              </p>
              <p className="text-[11px]">
                Pago: {selectedOrderForPrint.paymentMethod} (
                {selectedOrderForPrint.paymentStatus})
              </p>
            </div>

            <div className="flex gap-2 pt-2 font-sans font-semibold">
              <button
                onClick={() => setSelectedOrderForPrint(null)}
                className="flex-1 py-2 border border-[#D0D5DD] rounded-xl text-[#344054]"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  window.print();
                  setSelectedOrderForPrint(null);
                }}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
              >
                Imprimir Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear Pedido Manual */}
      {isManualModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-2xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#EAECF0] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#EAECF0]">
              <h3 className="font-bold text-sm text-[#101828]">
                Registrar Pedido Telefónico / Manual
              </h3>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="text-[#667085] hover:text-[#101828]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManualOrder} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-[#344054]">Nombre Cliente</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Marcelo Rojas"
                    value={manualCustomerName}
                    onChange={(e) => setManualCustomerName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#D0D5DD] rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#344054]">Teléfono / WhatsApp</label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej: 71239845"
                    value={manualCustomerPhone}
                    onChange={(e) => setManualCustomerPhone(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#D0D5DD] rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#344054]">Dirección de Entrega</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Av. Mortensen frente a banco Unión"
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#D0D5DD] rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#344054]">Punto de Referencia</label>
                <input
                  type="text"
                  placeholder="Ej: Portón azul, tocar timbre"
                  value={manualReference}
                  onChange={(e) => setManualReference(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#D0D5DD] rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#344054]">Plato o Artículo</label>
                <input
                  type="text"
                  required
                  value={manualDishName}
                  onChange={(e) => setManualDishName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#D0D5DD] rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-[#344054]">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={manualDishQty}
                    onChange={(e) => setManualDishQty(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-[#D0D5DD] rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#344054]">Precio Unitario (Bs.)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={manualDishPrice}
                    onChange={(e) => setManualDishPrice(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-[#D0D5DD] rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#344054]">Método de Pago</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setManualPaymentMethod("EFECTIVO")}
                    className={`flex-1 p-2 rounded-xl border text-center font-bold ${
                      manualPaymentMethod === "EFECTIVO"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                        : "border-[#EAECF0] text-[#667085]"
                    }`}
                  >
                    💵 Efectivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualPaymentMethod("QR_BANCO")}
                    className={`flex-1 p-2 rounded-xl border text-center font-bold ${
                      manualPaymentMethod === "QR_BANCO"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                        : "border-[#EAECF0] text-[#667085]"
                    }`}
                  >
                    📲 QR Simple
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-[#EAECF0] flex justify-between font-bold text-sm">
                <span>Total Calculado:</span>
                <span className="text-emerald-700">
                  {(manualDishQty * manualDishPrice + 5.0).toFixed(2)} Bs.
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="flex-1 py-2 border border-[#D0D5DD] rounded-xl text-[#344054] font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingManual}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                >
                  {isCreatingManual ? "Guardando..." : "Crear Pedido"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
