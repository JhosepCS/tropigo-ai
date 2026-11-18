"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bike,
  CheckCircle2,
  ChefHat,
  Clock3,
  Loader2,
  MapPin,
  Package,
  Phone,
  Store,
  XCircle,
} from "lucide-react";

type MerchantOrder = {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  totalAmount: number;
  deliveryFee: number;
  paymentMethod: string;
  deliveryAddressText: string;
  referencePoint: string | null;
  customerNotes: string | null;
  customerName: string;
  customerPhone: string | null;
  riderName: string | null;
  items: {
    name: string;
    quantity: number;
    variantName: string | null;
    subtotal: number;
    specialInstructions: string | null;
  }[];
};

const money = (value: number) => `${Number(value || 0).toFixed(2)} Bs.`;

const PAYMENT_LABELS: Record<string, string> = {
  EFECTIVO: "Efectivo al entregar",
  QR_BANCO: "QR bancario",
  TIGO_MONEY: "Tigo Money",
  TRANSFERENCIA: "Transferencia",
  QR_SIMPLE: "QR Simple",
  YAPE: "Yape",
  ZAS: "ZAS",
  ALTOKE: "Altoke",
};

const STATUS_LABEL: Record<string, string> = {
  RECIBIDO: "Nuevo",
  EN_PREPARACION: "En cocina",
  LISTO_RECOJO: "Listo para recojo",
  ASIGNADO: "Repartidor asignado",
  EN_CAMINO: "En camino al cliente",
};

export function MerchantAccessClient({
  token,
  merchant,
  initialOrders,
}: {
  token: string;
  merchant: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    isOpen: boolean;
    cityName: string;
  };
  initialOrders: MerchantOrder[];
}) {
  const [orders, setOrders] = useState<MerchantOrder[]>(initialOrders);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const router = useRouter();

  // Refrescar la cocina cada 25 segundos: los pedidos nuevos aparecen solos.
  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 25_000);
    return () => window.clearInterval(timer);
  }, [router]);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 4500);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const runAction = async (orderId: string, action: string) => {
    if (action === "cancel") {
      const confirmed = window.confirm(
        "¿Cancelar este pedido? El cliente y el repartidor recibirán el aviso."
      );
      if (!confirmed) return;
    }

    setBusy(`${orderId}:${action}`);
    setError(null);
    try {
      const res = await fetch(`/api/comercio/acceso/${token}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "No se pudo actualizar el pedido.");
        return;
      }
      const updated = data?.order;
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? { ...order, status: updated?.status || order.status }
            : order
        )
      );
      const target = orders.find((order) => order.id === orderId);
      if (action === "accept") setFlash(`Pedido ${target?.orderNumber || ""} aceptado. ¡A cocinar!`);
      if (action === "ready") setFlash(`Pedido ${target?.orderNumber || ""} listo. Buscando repartidor...`);
      if (action === "cancel") setFlash(`Pedido ${target?.orderNumber || ""} cancelado.`);
    } catch {
      setError("Error de conexión. Revisa tu internet e intenta otra vez.");
    } finally {
      setBusy(null);
    }
  };

  const newOrders = orders.filter((order) => order.status === "RECIBIDO");
  const cooking = orders.filter((order) => order.status === "EN_PREPARACION");
  const onTheWay = orders.filter((order) =>
    ["LISTO_RECOJO", "ASIGNADO", "EN_CAMINO"].includes(order.status)
  );
  const salesToday = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-[#331E39] p-5 text-white shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#C8A2D8]">
              Cocina · {merchant.cityName}
            </p>
            <h1 className="mt-1 text-xl font-black leading-tight">{merchant.name}</h1>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-[#E6D2F0]">
              <MapPin className="h-3 w-3" />
              {merchant.address || "Ivirgarzama"}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${
              merchant.isOpen ? "bg-emerald-400/20 text-emerald-100" : "bg-amber-400/20 text-amber-100"
            }`}
          >
            {merchant.isOpen ? "Abierto" : "Cerrado"}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-white/10 px-2 py-2">
            <p className="text-lg font-black">{newOrders.length}</p>
            <p className="text-[10px] uppercase tracking-wide text-[#C8A2D8]">Nuevos</p>
          </div>
          <div className="rounded-2xl bg-white/10 px-2 py-2">
            <p className="text-lg font-black">{cooking.length}</p>
            <p className="text-[10px] uppercase tracking-wide text-[#C8A2D8]">En cocina</p>
          </div>
          <div className="rounded-2xl bg-white/10 px-2 py-2">
            <p className="text-lg font-black">{money(salesToday)}</p>
            <p className="text-[10px] uppercase tracking-wide text-[#C8A2D8]">En curso</p>
          </div>
        </div>
      </section>

      {flash && (
        <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {flash}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}

      {orders.length === 0 && (
        <div className="rounded-3xl border border-dashed border-[#E0CCE9] bg-white p-8 text-center">
          <ChefHat className="mx-auto h-8 w-8 text-[#C8A2D8]" />
          <p className="mt-2 text-sm font-black text-[#331E39]">Sin pedidos activos</p>
          <p className="mt-1 text-xs text-[#6B5A72]">
            Cuando TropiGO confirme un pedido, te llega el aviso por WhatsApp y
            aparece aquí con un botón para aceptarlo.
          </p>
        </div>
      )}

      {orders.map((order) => {
        const isNew = order.status === "RECIBIDO";
        const isCooking = order.status === "EN_PREPARACION";
        const busyKey = (action: string) => busy === `${order.id}:${action}`;
        const time = new Date(order.createdAt).toLocaleTimeString("es-BO", {
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <article
            key={order.id}
            className={`overflow-hidden rounded-3xl border bg-white shadow-sm ${
              isNew ? "border-[#8E58A6] ring-2 ring-[#C8A2D8]/40" : "border-[#E0CCE9]"
            }`}
          >
            <div className="flex items-center justify-between gap-2 border-b border-[#E8DFED] bg-[#F7F4F9] px-4 py-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-[#8E58A6]">
                  Pedido · {time}
                </p>
                <p className="text-sm font-black text-[#331E39]">{order.orderNumber}</p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                  isNew
                    ? "bg-[#331E39] text-white"
                    : isCooking
                    ? "bg-amber-100 text-amber-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {STATUS_LABEL[order.status] || order.status}
              </span>
            </div>

            <div className="space-y-3 px-4 py-4 text-xs">
              <div className="rounded-2xl border border-[#E8DFED] p-3">
                <p className="flex items-center gap-1 text-[10px] font-black uppercase text-[#6B5A72]">
                  <Package className="h-3 w-3 text-[#8E58A6]" />
                  Detalle
                </p>
                <ul className="mt-1.5 space-y-1">
                  {order.items.map((item, index) => (
                    <li key={index} className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-[#1E1523]">
                        {item.quantity}x {item.name}
                        {item.variantName ? ` (${item.variantName})` : ""}
                        {item.specialInstructions ? (
                          <span className="block text-[10px] font-normal text-amber-700">
                            {item.specialInstructions}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-[11px] text-[#6B5A72]">
                        {money(item.subtotal)}
                      </span>
                    </li>
                  ))}
                </ul>
                {order.customerNotes && (
                  <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800">
                    Nota: {order.customerNotes}
                  </p>
                )}
              </div>

              <div className="rounded-2xl bg-[#F7F4F9] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-black uppercase text-[#6B5A72]">
                      Entregar a
                    </p>
                    <p className="mt-0.5 text-sm font-black text-[#1E1523]">
                      {order.customerName}
                    </p>
                    <p className="text-[11px] text-[#331E39]">{order.deliveryAddressText}</p>
                    {order.referencePoint && (
                      <p className="mt-0.5 text-[10px] text-[#6B5A72]">
                        Ref: {order.referencePoint}
                      </p>
                    )}
                  </div>
                  {order.customerPhone && (
                    <a
                      href={`tel:${order.customerPhone}`}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-[#331E39]"
                    >
                      <Phone className="h-3 w-3" />
                      Llamar
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-[#331E39] px-3 py-2.5 text-white">
                <span className="text-[10px] font-black uppercase tracking-wide text-[#C8A2D8]">
                  {PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod} · Envío{" "}
                  {money(order.deliveryFee)}
                </span>
                <span className="text-sm font-black">{money(order.totalAmount)}</span>
              </div>

              {order.riderName && (
                <p className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2 text-[11px] font-semibold text-blue-800">
                  <Bike className="h-3.5 w-3.5" />
                  Repartidor: {order.riderName}
                </p>
              )}

              {isNew && (
                <button
                  type="button"
                  disabled={busyKey("accept")}
                  onClick={() => runAction(order.id, "accept")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#331E39] px-4 py-3.5 text-sm font-black text-white transition hover:bg-[#4A2C54] disabled:opacity-60"
                >
                  {busyKey("accept") ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ChefHat className="h-4 w-4" />
                  )}
                  Aceptar pedido — En cocina
                </button>
              )}

              {isCooking && (
                <button
                  type="button"
                  disabled={busyKey("ready")}
                  onClick={() => runAction(order.id, "ready")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {busyKey("ready") ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  ✅ Pedido listo para recojo
                </button>
              )}

              {(isNew || isCooking) && (
                <button
                  type="button"
                  disabled={busyKey("cancel")}
                  onClick={() => runAction(order.id, "cancel")}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-[11px] font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                >
                  {busyKey("cancel") ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                  Cancelar pedido
                </button>
              )}

              {!isNew && !isCooking && (
                <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#6B5A72]">
                  <Clock3 className="h-3.5 w-3.5" />
                  {order.status === "EN_CAMINO"
                    ? "El repartidor va en camino al cliente."
                    : "Esperando que el repartidor recoja el pedido."}
                </p>
              )}
            </div>
          </article>
        );
      })}

      {onTheWay.length > 0 && (
        <p className="flex items-center justify-center gap-1.5 text-[10px] text-[#6B5A72]">
          <Store className="h-3 w-3" />
          {onTheWay.length} pedido(s) en reparto. Esta página se actualiza al recargar.
        </p>
      )}
    </div>
  );
}
