"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bike,
  Clock,
  ExternalLink,
  MapPin,
  Navigation,
  Package,
  Phone,
  RefreshCw,
  Share2,
  ShieldCheck,
  Store,
} from "lucide-react";
import type { TrackingData } from "@/lib/tracking/service";

const FINAL_STATUSES = new Set(["ENTREGADO", "FINALIZADO", "CANCELADO"]);

function formatDateTime(value: string | null): string {
  if (!value) return "sin datos";
  try {
    return new Date(value).toLocaleString("es-BO", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

function statusTone(status: string): string {
  if (status === "ENTREGADO" || status === "FINALIZADO") {
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }
  if (status === "CANCELADO") {
    return "bg-red-100 text-red-800 border-red-200";
  }
  if (status === "EN_CAMINO" || status === "EN_CURSO") {
    return "bg-amber-100 text-amber-800 border-amber-200";
  }
  return "bg-sky-100 text-sky-800 border-sky-200";
}

export function TrackingClient({ initialData }: { initialData: TrackingData }) {
  const [data, setData] = useState<TrackingData>(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetch, setLastFetch] = useState<Date>(new Date());

  useEffect(() => {
    if (FINAL_STATUSES.has(data.status)) return;

    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/public/tracking/${initialData.id}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const next = (await res.json()) as TrackingData;
        if (!cancelled) {
          setData(next);
          setLastFetch(new Date());
        }
      } catch {
        // Se reintenta en el siguiente ciclo.
      }
    };

    const interval = window.setInterval(load, 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [data.status, initialData.id]);

  const manualRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/public/tracking/${initialData.id}`, {
        cache: "no-store",
      });
      if (res.ok) {
        setData((await res.json()) as TrackingData);
        setLastFetch(new Date());
      }
    } finally {
      setRefreshing(false);
    }
  };

  const shareText = useMemo(
    () =>
      `Sigue mi ${data.type === "MOTOTAXI" ? "carrera" : "pedido"} ${data.code} en TropiGO: ${
        typeof window !== "undefined" ? window.location.href : ""
      }`,
    [data.code, data.type]
  );

  const whatsappShare = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="min-h-screen bg-[#F7F9FB] px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-3xl space-y-4">
        <header className="flex items-start justify-between gap-3">
          <div>
            <Link
              href="/"
              className="text-[11px] font-bold uppercase tracking-wider text-emerald-700"
            >
              TropiGO Ivirgarzama
            </Link>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-[#101828]">
              Seguimiento en vivo
            </h1>
            <p className="text-xs text-[#667085]">
              El mapa se actualiza cada 10 segundos mientras el repartidor comparte su GPS.
            </p>
          </div>
          <button
            onClick={manualRefresh}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#D0D5DD] bg-white px-3 py-2 text-[11px] font-bold text-[#344054] hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </header>

        <section className="overflow-hidden rounded-3xl border border-[#EAECF0] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#EAECF0] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                {data.type === "MOTOTAXI" ? (
                  <Bike className="h-5 w-5" />
                ) : (
                  <Package className="h-5 w-5" />
                )}
              </div>
              <div>
                <p className="font-mono text-sm font-black text-[#101828]">{data.code}</p>
                <p className="text-[11px] text-[#667085]">
                  {data.type === "MOTOTAXI" ? "Mototaxi" : "Delivery"} ·{" "}
                  {data.totalAmount.toFixed(2)} Bs.
                </p>
              </div>
            </div>
            <span
              className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-[11px] font-black ${statusTone(
                data.status
              )}`}
            >
              {data.statusLabel}
            </span>
          </div>

          <div className="relative h-[300px] w-full bg-slate-100 sm:h-[380px]">
            <iframe
              title={`Mapa de seguimiento ${data.code}`}
              src={data.embedUrl}
              className="h-full w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
            <div className="absolute left-3 top-3 rounded-xl bg-white/95 px-3 py-2 text-[10px] font-bold text-[#344054] shadow-sm backdrop-blur">
              <span className="flex items-center gap-1.5">
                <Navigation className="h-3 w-3 text-emerald-600" />
                {data.distanceKm != null
                  ? `${data.distanceKm.toFixed(1)} km estimados`
                  : "GPS aún no disponible"}
                {data.etaMinutes != null ? ` · ~${data.etaMinutes} min` : ""}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
            <a
              href={data.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#101828] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#1D2939]"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir en Google Maps
            </a>
            <a
              href={whatsappShare}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
            >
              <Share2 className="h-4 w-4" />
              Compartir por WhatsApp
            </a>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-[#EAECF0] bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#667085]">
              Repartidor / Conductor
            </p>
            {data.rider ? (
              <div className="mt-2 space-y-1.5">
                <p className="text-sm font-black text-[#101828]">{data.rider.name}</p>
                <p className="text-[11px] text-[#667085]">
                  {data.rider.vehicleType} · Placa {data.rider.plateNumber}
                </p>
                {data.rider.phone && (
                  <a
                    href={`tel:${data.rider.phone}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Llamar
                  </a>
                )}
                <p className="text-[10px] text-slate-400">
                  Última ubicación: {formatDateTime(data.rider.locationUpdatedAt)}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-[#667085]">
                Todavía no hay un repartidor asignado. Te avisaremos por WhatsApp.
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-[#EAECF0] bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#667085]">
              Destino
            </p>
            <div className="mt-2 flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                <p className="text-xs font-bold text-[#101828]">
                  {data.destinationAddress}
                </p>
                {data.originAddress && (
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-[#667085]">
                    <Store className="h-3 w-3" />
                    Origen: {data.originAddress}
                  </p>
                )}
                <p className="mt-1 flex items-center gap-1 text-[10px] text-[#667085]">
                  <Clock className="h-3 w-3" />
                  Actualizado: {formatDateTime(data.updatedAt)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[#EAECF0] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#667085]">
              Historial del servicio
            </p>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Datos protegidos
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {data.steps.length === 0 ? (
              <p className="text-xs text-[#667085]">Sin movimientos registrados aún.</p>
            ) : (
              data.steps.map((step, index) => (
                <div
                  key={`${step.at}-${index}`}
                  className="flex items-start gap-2 rounded-xl bg-[#F9FAFB] px-3 py-2"
                >
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                  <div>
                    <p className="text-[11px] font-bold text-[#344054]">{step.status}</p>
                    {step.comment && (
                      <p className="text-[10px] text-[#667085]">{step.comment}</p>
                    )}
                    <p className="text-[9px] text-slate-400">{formatDateTime(step.at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <p className="pb-6 text-center text-[10px] text-slate-400">
          Última actualización: {lastFetch.toLocaleTimeString("es-BO")} · TropiGO
          Ivirgarzama, Trópico de Cochabamba
        </p>
      </div>
    </div>
  );
}
