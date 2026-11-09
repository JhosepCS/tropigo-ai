"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ShoppingBag,
  Search,
  CheckCircle2,
  Clock,
  Bike,
  AlertTriangle,
  RotateCcw,
  Store,
  Phone,
  MapPin,
  History,
  UserCheck,
  XCircle,
  Loader2,
  Package,
} from "lucide-react";

interface StatusHistoryEntry {
  id: string;
  fromStatus?: string | null;
  toStatus: string;
  comment?: string | null;
  createdAt: string;
}

interface Rider {
  id: string;
  name: string;
  phone?: string | null;
  vehicleType?: string | null;
  plateNumber?: string | null;
  isAvailable: boolean;
}

interface OrderItem {
  id: string;
  orderNumber: string;
  customer?: { name?: string | null; phone?: string | null } | null;
  merchant?: { name?: string | null } | null;
  assignedRider?: Rider | null;
  items?: Array<{
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    variantName?: string | null;
    optionsSnapshotJson?: string | null;
    specialInstructions?: string | null;
  }>;
  deliveryZone?: { name: string } | null;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  deliveryAddressText: string;
  referencePoint?: string | null;
  customerNotes?: string | null;
  createdAt: string;
  statusHistory?: StatusHistoryEntry[];
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  RECIBIDO: { label: "Recibido", className: "bg-blue-50 text-blue-700 border-blue-200" },
  EN_PREPARACION: { label: "En preparación", className: "bg-amber-50 text-amber-800 border-amber-200" },
  LISTO_RECOJO: { label: "Listo para recojo", className: "bg-cyan-50 text-cyan-800 border-cyan-200" },
  ASIGNADO: { label: "Repartidor asignado", className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  EN_CAMINO: { label: "En camino", className: "bg-purple-50 text-purple-700 border-purple-200" },
  ENTREGADO: { label: "Entregado", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CANCELADO: { label: "Cancelado", className: "bg-red-50 text-red-700 border-red-200" },
};

const STATUS_TABS = [
  { id: "ALL", label: "Todos" },
  { id: "RECIBIDO", label: "Recibidos" },
  { id: "EN_PREPARACION", label: "En cocina" },
  { id: "LISTO_RECOJO", label: "Listos" },
  { id: "ASIGNADO", label: "Asignados" },
  { id: "EN_CAMINO", label: "En camino" },
  { id: "ENTREGADO", label: "Entregados" },
  { id: "CANCELADO", label: "Cancelados" },
];

const money = (value: number) =>
  `${Number(value || 0).toLocaleString("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} Bs.`;

const dateTime = (value: string) => {
  try {
    return new Date(value).toLocaleString("es-BO", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
};

export function PedidosClient({
  initialOrders,
  riders,
}: {
  initialOrders: OrderItem[];
  riders: Rider[];
}) {
  const [orders, setOrders] = useState<OrderItem[]>(initialOrders);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [riderSelections, setRiderSelections] = useState<Record<string, string>>({});
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});

  const refreshOrders = async () => {
    setIsRefreshing(true);
    setActionError(null);
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudieron cargar los pedidos.");
      }
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (e: any) {
      setActionError(e.message || "Error al refrescar pedidos.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const filtered = useMemo(() => {
    return orders.filter((order) => {
      if (statusFilter !== "ALL" && order.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        order.orderNumber.toLowerCase().includes(q) ||
        (order.customer?.name || "").toLowerCase().includes(q) ||
        (order.customer?.phone || "").toLowerCase().includes(q) ||
        (order.merchant?.name || "").toLowerCase().includes(q)
      );
    });
  }, [orders, search, statusFilter]);

  const counts = useMemo(() => {
    const result: Record<string, number> = { ALL: orders.length };
    for (const order of orders) {
      result[order.status] = (result[order.status] || 0) + 1;
    }
    return result;
  }, [orders]);

  const updateStatus = async (orderId: string, status: string) => {
    setBusyOrderId(orderId);
    setActionError(null);
    try {
      const res = await fetch("/api/orders/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo actualizar el estado.");
      }
      await refreshOrders();
    } catch (e: any) {
      setActionError(e.message || "Error al actualizar el estado.");
    } finally {
      setBusyOrderId(null);
    }
  };

  const assignRider = async (orderId: string) => {
    const riderId = riderSelections[orderId];
    if (!riderId) {
      setActionError("Selecciona un repartidor antes de asignar.");
      return;
    }

    setBusyOrderId(orderId);
    setActionError(null);
    try {
      const res = await fetch("/api/orders/assign-rider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, riderId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo asignar el repartidor.");
      }
      await refreshOrders();
    } catch (e: any) {
      setActionError(e.message || "Error al asignar repartidor.");
    } finally {
      setBusyOrderId(null);
    }
  };

  const ActionButton = ({
    onClick,
    children,
    variant = "primary",
    disabled,
  }: {
    onClick: () => void;
    children: ReactNode;
    variant?: "primary" | "danger";
    disabled?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-colors disabled:opacity-50 ${
        variant === "danger"
          ? "bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
          : "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#EAECF0] text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Pedidos reales en base de datos ({orders.length})
          </span>
          <span className="text-[#667085] hidden md:inline">
            Solo pedidos creados por el flujo oficial de WhatsApp tras confirmación explícita.
          </span>
        </div>

        <button
          onClick={refreshOrders}
          disabled={isRefreshing}
          className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl font-bold border text-xs bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800 transition-colors disabled:opacity-50"
        >
          <RotateCcw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>{isRefreshing ? "Actualizando..." : "Refrescar"}</span>
        </button>
      </div>

      {actionError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl border border-[#EAECF0] flex flex-col gap-3">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-[#98A2B3] absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código TRP, cliente, teléfono o comercio..."
            className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl pl-9 pr-3 py-2 text-xs text-[#101828] focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 text-xs">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors ${
                statusFilter === tab.id
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-[#D0D5DD] text-[#475467] hover:bg-[#F2F4F7]"
              }`}
            >
              {tab.label}
              <span className="ml-1 opacity-70">{counts[tab.id] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-[#D0D5DD] rounded-3xl p-10 text-center space-y-2">
          <ShoppingBag className="w-8 h-8 text-[#98A2B3] mx-auto" />
          <p className="font-bold text-sm text-[#101828]">
            No hay pedidos para mostrar
          </p>
          <p className="text-xs text-[#667085] max-w-md mx-auto">
            Los pedidos aparecen aquí cuando un cliente completa el flujo de WhatsApp:
            cotización oficial, resumen, confirmación explícita y registro atómico en la base de datos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((order) => {
            const status = STATUS_META[order.status] || {
              label: order.status,
              className: "bg-slate-100 text-slate-800 border-slate-200",
            };
            const isBusy = busyOrderId === order.id;
            const history = order.statusHistory || [];
            const showAllHistory = expandedHistory[order.id];
            const visibleHistory = showAllHistory ? history : history.slice(-3);
            const availableRiders = riders.filter(
              (rider) => rider.isAvailable || rider.id === order.assignedRider?.id
            );

            return (
              <div
                key={order.id}
                className="bg-white p-5 rounded-3xl border border-[#EAECF0] shadow-2xs space-y-3 hover:border-emerald-300 transition-colors"
              >
                <div className="flex items-center justify-between border-b border-[#EAECF0] pb-2.5 gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono font-black text-sm text-[#101828]">
                      {order.orderNumber}
                    </span>
                    <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.2 rounded">
                      WhatsApp IA
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.className}`}
                  >
                    {status.label}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <p className="font-bold text-[#101828] flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-emerald-600" />
                    {order.merchant?.name || "Comercio no asignado"}
                  </p>

                  <p className="text-[#475467] flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {order.customer?.name || "Cliente WhatsApp"}{" "}
                    {order.customer?.phone ? `(${order.customer.phone})` : ""}
                  </p>

                  <p className="text-[#475467] flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">
                      {order.deliveryAddressText}
                      {order.referencePoint ? ` (Ref: ${order.referencePoint})` : ""}
                    </span>
                  </p>

                  <p className="text-[#475467] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {dateTime(order.createdAt)}
                    {order.deliveryZone?.name ? ` • Zona: ${order.deliveryZone.name}` : ""}
                  </p>

                  {order.assignedRider && (
                    <p className="text-[#475467] flex items-center gap-1.5">
                      <Bike className="w-3.5 h-3.5 text-indigo-500" />
                      {order.assignedRider.name}
                      {order.assignedRider.plateNumber
                        ? ` (${order.assignedRider.plateNumber})`
                        : ""}
                    </p>
                  )}

                  {order.customerNotes && (
                    <p className="text-[11px] text-amber-900 bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                      <span className="font-bold">Nota cliente:</span> {order.customerNotes}
                    </p>
                  )}
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      Detalle del pedido
                    </span>
                    <span className="text-[9px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded">
                      {order.paymentMethod === "QR_BANCO" ? "QR Simple" : "Efectivo"}
                    </span>
                  </div>

                  {(order.items || []).map((item) => {
                    let options: string[] = [];
                    try {
                      options = item.optionsSnapshotJson
                        ? JSON.parse(item.optionsSnapshotJson)
                        : [];
                    } catch {
                      options = [];
                    }

                    return (
                      <div key={item.id} className="text-slate-800 text-[11px] space-y-0.5">
                        <div className="flex justify-between gap-2">
                          <span>
                            {item.quantity}x {item.productName}
                            {item.variantName ? ` (${item.variantName})` : ""}
                            {options.length ? ` + ${options.join(", ")}` : ""}
                          </span>
                          <span className="font-bold shrink-0">{money(item.subtotal)}</span>
                        </div>
                        {item.specialInstructions && (
                          <p className="text-[10px] text-amber-700 italic">
                            Nota: {item.specialInstructions}
                          </p>
                        )}
                      </div>
                    );
                  })}

                  <div className="border-t border-slate-200 pt-1 flex justify-between text-slate-600 text-[11px]">
                    <span>Subtotal:</span>
                    <span>{money(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 text-[11px]">
                    <span>Delivery oficial:</span>
                    <span>{money(order.deliveryFee)}</span>
                  </div>
                  <div className="flex justify-between font-black text-slate-950 text-xs pt-0.5">
                    <span>Total:</span>
                    <span className="text-emerald-700">{money(order.totalAmount)}</span>
                  </div>
                </div>

                <div className="border-t border-[#EAECF0] pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedHistory((prev) => ({
                        ...prev,
                        [order.id]: !prev[order.id],
                      }))
                    }
                    className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-800"
                  >
                    <History className="w-3 h-3" />
                    Historial de estados ({history.length})
                  </button>

                  <div className="mt-1.5 space-y-1">
                    {visibleHistory.length === 0 ? (
                      <p className="text-[10px] text-slate-400">Sin historial registrado.</p>
                    ) : (
                      visibleHistory.map((entry) => (
                        <div
                          key={entry.id}
                          className="text-[10px] text-slate-600 flex items-start gap-1.5"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1 shrink-0" />
                          <span>
                            <strong>{STATUS_META[entry.toStatus]?.label || entry.toStatus}</strong>
                            {entry.fromStatus
                              ? ` (desde ${STATUS_META[entry.fromStatus]?.label || entry.fromStatus})`
                              : ""}{" "}
                            • {dateTime(entry.createdAt)}
                            {entry.comment ? ` — ${entry.comment}` : ""}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-1 flex flex-wrap items-center gap-1.5">
                  {isBusy && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Procesando...
                    </span>
                  )}

                  {!isBusy && order.status === "RECIBIDO" && (
                    <>
                      <ActionButton onClick={() => updateStatus(order.id, "EN_PREPARACION")}>
                        <Package className="w-3 h-3" />
                        Iniciar preparación
                      </ActionButton>
                      <ActionButton
                        variant="danger"
                        onClick={() => updateStatus(order.id, "CANCELADO")}
                      >
                        <XCircle className="w-3 h-3" />
                        Cancelar
                      </ActionButton>
                    </>
                  )}

                  {!isBusy && order.status === "EN_PREPARACION" && (
                    <>
                      <ActionButton onClick={() => updateStatus(order.id, "LISTO_RECOJO")}>
                        <CheckCircle2 className="w-3 h-3" />
                        Marcar listo
                      </ActionButton>
                      <ActionButton
                        variant="danger"
                        onClick={() => updateStatus(order.id, "CANCELADO")}
                      >
                        <XCircle className="w-3 h-3" />
                        Cancelar
                      </ActionButton>
                    </>
                  )}

                  {!isBusy && order.status === "LISTO_RECOJO" && (
                    <>
                      <select
                        value={riderSelections[order.id] || ""}
                        onChange={(e) =>
                          setRiderSelections((prev) => ({
                            ...prev,
                            [order.id]: e.target.value,
                          }))
                        }
                        className="text-[11px] bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-2 py-1.5 text-[#101828] font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="">Seleccionar repartidor...</option>
                        {availableRiders.map((rider) => (
                          <option key={rider.id} value={rider.id}>
                            {rider.name}
                            {rider.plateNumber ? ` • ${rider.plateNumber}` : ""}
                          </option>
                        ))}
                      </select>
                      <ActionButton onClick={() => assignRider(order.id)}>
                        <UserCheck className="w-3 h-3" />
                        Asignar
                      </ActionButton>
                      <ActionButton
                        variant="danger"
                        onClick={() => updateStatus(order.id, "CANCELADO")}
                      >
                        <XCircle className="w-3 h-3" />
                        Cancelar
                      </ActionButton>
                    </>
                  )}

                  {!isBusy && order.status === "ASIGNADO" && (
                    <>
                      <ActionButton onClick={() => updateStatus(order.id, "EN_CAMINO")}>
                        <Bike className="w-3 h-3" />
                        Marcar en camino
                      </ActionButton>
                      <ActionButton
                        variant="danger"
                        onClick={() => updateStatus(order.id, "CANCELADO")}
                      >
                        <XCircle className="w-3 h-3" />
                        Cancelar
                      </ActionButton>
                    </>
                  )}

                  {!isBusy && order.status === "EN_CAMINO" && (
                    <>
                      <ActionButton onClick={() => updateStatus(order.id, "ENTREGADO")}>
                        <CheckCircle2 className="w-3 h-3" />
                        Marcar entregado
                      </ActionButton>
                      <ActionButton
                        variant="danger"
                        onClick={() => updateStatus(order.id, "CANCELADO")}
                      >
                        <XCircle className="w-3 h-3" />
                        Cancelar
                      </ActionButton>
                    </>
                  )}

                  {(order.status === "ENTREGADO" || order.status === "CANCELADO") && !isBusy && (
                    <span className="text-[10px] font-bold text-slate-400">
                      Pedido cerrado. No hay más transiciones disponibles.
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
