"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bike,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  Navigation,
  Package,
  Phone,
  Store,
  Wallet,
} from "lucide-react";

type AccessOrder = {
  id: string;
  orderNumber: string;
  status: string;
  deliveryAddressText: string;
  referencePoint: string | null;
  totalAmount: number;
  deliveryFee: number;
  paymentMethod: string;
  paymentStatus: string;
  riderAcceptedAt: string | null;
  riderArrivedAt: string | null;
  customerName: string;
  customerPhone: string | null;
  merchantName: string;
  merchantAddress: string | null;
  merchantPhone: string | null;
  items: { name: string; quantity: number }[];
};

type CompletedOrder = {
  id: string;
  orderNumber: string;
  deliveryFee: number;
  deliveryAddressText: string;
  deliveredAt: string;
};

const money = (value: number) => `${Number(value || 0).toFixed(2)} Bs.`;

export function RiderAccessClient({
  token,
  rider,
  initialOrders,
  completedToday,
}: {
  token: string;
  rider: {
    id: string;
    name: string;
    vehicleType: string;
    plateNumber: string;
    cityName: string;
  };
  initialOrders: AccessOrder[];
  completedToday: CompletedOrder[];
}) {
  const [orders, setOrders] = useState<AccessOrder[]>(initialOrders);
  const [completed, setCompleted] = useState<CompletedOrder[]>(completedToday);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "sharing" | "error">("idle");
  const [gpsNote, setGpsNote] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const router = useRouter();

  // Sincronizar carreras nuevas asignadas por la central.
  useEffect(() => {
    setOrders(initialOrders);
    setCompleted(completedToday);
  }, [initialOrders, completedToday]);

  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 30_000);
    return () => window.clearInterval(timer);
  }, [router]);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 4500);
    return () => window.clearTimeout(timer);
  }, [flash]);

  useEffect(() => {
    if (!gpsEnabled) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setGpsStatus("idle");
      return;
    }
    if (!("geolocation" in navigator)) {
      setGpsStatus("error");
      setGpsNote("Este celular no tiene GPS disponible.");
      setGpsEnabled(false);
      return;
    }

    setGpsStatus("sharing");
    setGpsNote("Compartiendo tu ubicación con el cliente...");

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        try {
          const res = await fetch(`/api/repartidor/acceso/${token}/location`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data?.error || "No se pudo enviar la ubicación.");
          }
          setGpsStatus("sharing");
          setGpsNote(
            `Ubicación en vivo desde ${new Date().toLocaleTimeString("es-BO")}.`
          );
        } catch (err: any) {
          setGpsStatus("error");
          setGpsNote(err?.message || "No se pudo enviar la ubicación.");
        }
      },
      (err) => {
        setGpsStatus("error");
        setGpsNote(
          err.code === err.PERMISSION_DENIED
            ? "Permiso de ubicación denegado. Actívalo en el navegador."
            : "No se pudo obtener tu ubicación GPS."
        );
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [gpsEnabled, token]);

  const runAction = async (orderId: string, action: string) => {
    setBusy(`${orderId}:${action}`);
    setError(null);
    try {
      const res = await fetch(`/api/repartidor/acceso/${token}/action`, {
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
      if (action === "delivered") {
        const finished = orders.find((order) => order.id === orderId);
        setOrders((prev) => prev.filter((order) => order.id !== orderId));
        if (finished) {
          setCompleted((prev) => [
            {
              id: finished.id,
              orderNumber: finished.orderNumber,
              deliveryFee: finished.deliveryFee,
              deliveryAddressText: finished.deliveryAddressText,
              deliveredAt: new Date().toISOString(),
            },
            ...prev,
          ]);
        }
        setFlash(`Pedido ${finished?.orderNumber || ""} entregado. ¡Buen trabajo!`);
      } else {
        setOrders((prev) =>
          prev.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  status: updated?.status || order.status,
                  riderAcceptedAt: updated?.riderAcceptedAt || order.riderAcceptedAt,
                  riderArrivedAt: updated?.riderArrivedAt || order.riderArrivedAt,
                }
              : order
          )
        );
        if (action === "accept") setFlash("Carrera aceptada. Ya aparece en tu panel.");
        if (action === "arrived") setFlash("Marcaste que llegaste al local.");
        if (action === "pickup") setFlash("Pedido recogido. El cliente ya ve que vas en camino.");
      }
    } catch {
      setError("Error de conexión. Revisa tu internet e intenta otra vez.");
    } finally {
      setBusy(null);
    }
  };

  const earnings = completed.reduce((sum, order) => sum + Number(order.deliveryFee || 0), 0);

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-[#331E39] p-5 text-white shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#C8A2D8]">
          Panel de {rider.cityName}
        </p>
        <div className="mt-1 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-black leading-tight">{rider.name}</h1>
            <p className="mt-0.5 text-xs text-[#E6D2F0]">
              {rider.vehicleType === "TORITO_TRIMOVIL"
                ? "Torito / Trimóvil"
                : rider.vehicleType === "BICICLETA"
                ? "Bicicleta"
                : "Moto"}{" "}
              · {rider.plateNumber || "Sin placa"}
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-3 py-2 text-right">
            <p className="text-[10px] uppercase tracking-wide text-[#C8A2D8]">Hoy</p>
            <p className="text-lg font-black">{money(earnings)}</p>
            <p className="text-[10px] text-[#E6D2F0]">{completed.length} entregas</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setGpsEnabled((prev) => !prev)}
          className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
            gpsEnabled
              ? "bg-red-500/20 text-red-100 ring-1 ring-red-300/40"
              : "bg-white/10 text-white hover:bg-white/15"
          }`}
        >
          <Navigation className="h-4 w-4" />
          {gpsEnabled ? "Detener ubicación en vivo" : "Compartir mi ubicación en vivo"}
        </button>
        {gpsNote && (
          <p className={`mt-2 text-[11px] ${gpsStatus === "error" ? "text-red-200" : "text-[#E6D2F0]"}`}>
            {gpsNote}
          </p>
        )}
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

      <div className="flex items-center justify-between">
        <h2 className="text-xs font-black uppercase tracking-wider text-[#6B5A72]">
          Mis carreras activas ({orders.length})
        </h2>
        <span className="text-[10px] font-bold text-[#8E58A6]">Se actualiza al tocar</span>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#E0CCE9] bg-white p-8 text-center">
          <Bike className="mx-auto h-8 w-8 text-[#C8A2D8]" />
          <p className="mt-2 text-sm font-black text-[#331E39]">Sin carreras por ahora</p>
          <p className="mt-1 text-xs text-[#6B5A72]">
            Cuando un restaurante tenga un pedido listo, te llega el aviso a tu
            WhatsApp y aparece aquí.
          </p>
        </div>
      ) : (
        orders.map((order) => {
          const accepted = Boolean(order.riderAcceptedAt);
          const arrived = Boolean(order.riderArrivedAt);
          const enCamino = order.status === "EN_CAMINO";
          const paid = order.paymentStatus === "PAGADO_VERIFICADO";
          const busyKey = (action: string) => busy === `${order.id}:${action}`;
          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${order.deliveryAddressText}, ${rider.cityName}, Bolivia`
          )}`;

          return (
            <article
              key={order.id}
              className="overflow-hidden rounded-3xl border border-[#E0CCE9] bg-white shadow-sm"
            >
              <div className="flex items-center justify-between gap-2 border-b border-[#E8DFED] bg-[#F7F4F9] px-4 py-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wide text-[#8E58A6]">
                    Carrera
                  </p>
                  <p className="text-sm font-black text-[#331E39]">{order.orderNumber}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                    enCamino
                      ? "bg-blue-100 text-blue-800"
                      : accepted
                      ? "bg-amber-100 text-amber-800"
                      : "bg-[#331E39] text-white"
                  }`}
                >
                  {enCamino ? "En camino" : accepted ? "En recojo" : "Nueva"}
                </span>
              </div>

              <div className="space-y-3 px-4 py-4 text-xs">
                <div className="rounded-2xl border border-[#E8DFED] bg-[#F7F4F9] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 text-[10px] font-black uppercase text-[#6B5A72]">
                      <Store className="h-3 w-3 text-[#8E58A6]" />
                      Recoger en
                    </span>
                    {order.merchantPhone && (
                      <a
                        href={`tel:${order.merchantPhone}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-[#331E39]"
                      >
                        <Phone className="h-3 w-3" />
                        Llamar
                      </a>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-black text-[#1E1523]">{order.merchantName}</p>
                  <p className="text-[11px] text-[#6B5A72]">
                    {order.merchantAddress || "Ivirgarzama"}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#E0CCE9] bg-[#F3EAF7]/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 text-[10px] font-black uppercase text-[#6B5A72]">
                      <MapPin className="h-3 w-3 text-[#8E58A6]" />
                      Entregar a
                    </span>
                    {order.customerPhone && (
                      <a
                        href={`tel:${order.customerPhone}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-[#331E39]"
                      >
                        <Phone className="h-3 w-3" />
                        Llamar
                      </a>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-black text-[#1E1523]">{order.customerName}</p>
                  <p className="text-[11px] font-semibold text-[#331E39]">
                    {order.deliveryAddressText}
                  </p>
                  {order.referencePoint && (
                    <p className="mt-1 rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800">
                      Ref: {order.referencePoint}
                    </p>
                  )}
                </div>

                {order.items.length > 0 && (
                  <div className="rounded-2xl border border-[#E8DFED] p-3">
                    <p className="flex items-center gap-1 text-[10px] font-black uppercase text-[#6B5A72]">
                      <Package className="h-3 w-3 text-[#8E58A6]" />
                      Paquete
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {order.items.map((item, index) => (
                        <li key={index} className="flex justify-between gap-2 text-[11px] text-[#1E1523]">
                          <span className="font-semibold">
                            {item.quantity}x {item.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center justify-between rounded-2xl bg-[#331E39] px-3 py-2.5 text-white">
                  <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-[#C8A2D8]">
                    <Wallet className="h-3.5 w-3.5" />
                    {paid
                      ? "Pago verificado"
                      : order.paymentMethod === "EFECTIVO"
                      ? "Cobrar al entregar"
                      : "Cobro pendiente"}
                  </span>
                  <span className="text-sm font-black">
                    {paid ? "Pagado" : money(order.totalAmount)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E0CCE9] bg-white px-3 py-2.5 text-[11px] font-bold text-[#331E39] transition hover:bg-[#F7F4F9]"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    Ver mapa
                  </a>
                  <span className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#F7F4F9] px-3 py-2.5 text-[11px] font-bold text-[#6B5A72]">
                    <Clock3 className="h-3.5 w-3.5" />
                    Envío {money(order.deliveryFee)}
                  </span>
                </div>

                {!accepted && (
                  <button
                    type="button"
                    disabled={busyKey("accept")}
                    onClick={() => runAction(order.id, "accept")}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#331E39] px-4 py-3.5 text-sm font-black text-white transition hover:bg-[#4A2C54] disabled:opacity-60"
                  >
                    {busyKey("accept") ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Aceptar carrera
                  </button>
                )}

                {accepted && !arrived && (
                  <button
                    type="button"
                    disabled={busyKey("arrived")}
                    onClick={() => runAction(order.id, "arrived")}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3.5 text-sm font-black text-white transition hover:bg-amber-600 disabled:opacity-60"
                  >
                    {busyKey("arrived") ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Store className="h-4 w-4" />
                    )}
                    🟡 Estoy en el local
                  </button>
                )}

                {accepted && arrived && !enCamino && (
                  <button
                    type="button"
                    disabled={busyKey("pickup")}
                    onClick={() => runAction(order.id, "pickup")}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-black text-white transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    {busyKey("pickup") ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Bike className="h-4 w-4" />
                    )}
                    🔵 Recogí el pedido — En camino
                  </button>
                )}

                {enCamino && (
                  <button
                    type="button"
                    disabled={busyKey("delivered")}
                    onClick={() => runAction(order.id, "delivered")}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {busyKey("delivered") ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    🟢 Entregado al cliente
                  </button>
                )}
              </div>
            </article>
          );
        })
      )}

      {completed.length > 0 && (
        <section className="pt-2">
          <h2 className="mb-2 text-xs font-black uppercase tracking-wider text-[#6B5A72]">
            Entregadas hoy
          </h2>
          <div className="space-y-2">
            {completed.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between gap-2 rounded-2xl border border-[#E8DFED] bg-white px-3 py-2.5 text-xs"
              >
                <div>
                  <p className="font-black text-[#331E39]">{order.orderNumber}</p>
                  <p className="text-[10px] text-[#6B5A72]">{order.deliveryAddressText}</p>
                </div>
                <span className="font-black text-emerald-700">+{money(order.deliveryFee)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
