"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Bike,
  Search,
  Phone,
  CheckCircle2,
  XCircle,
  MapPin,
  Star,
  Package,
  Navigation,
  QrCode,
  Save,
  Loader2,
  Upload,
} from "lucide-react";
import {
  emptyRiderPaymentQr,
  parseRiderPaymentQr,
  RiderPaymentQr,
} from "@/lib/payments/rider";

const MAX_QR_BYTES = 1_200_000;

export function RepartidoresClient({ riders }: { riders: any[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RiderPaymentQr>(emptyRiderPaymentQr());
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; text: string } | null>(
    null
  );
  const [qrByRider, setQrByRider] = useState<Record<string, RiderPaymentQr | null>>(
    () => {
      const initial: Record<string, RiderPaymentQr | null> = {};
      riders.forEach((rider) => {
        initial[rider.id] = parseRiderPaymentQr(rider.paymentQrJson);
      });
      return initial;
    }
  );

  const filtered = riders.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.phone.includes(searchQuery)
  );

  const openEditor = (rider: any) => {
    setEditingId(rider.id);
    setFeedback(null);
    setDraft(qrByRider[rider.id] || emptyRiderPaymentQr());
  };

  const readQrFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFeedback({ type: "error", text: "El archivo debe ser una imagen." });
      return;
    }
    if (file.size > MAX_QR_BYTES) {
      setFeedback({
        type: "error",
        text: "La imagen supera 1.2 MB. Usa una captura más liviana.",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setDraft((current) => ({
        ...current,
        qrImage: typeof reader.result === "string" ? reader.result : "",
      }));
      setFeedback(null);
    };
    reader.readAsDataURL(file);
  };

  const saveQr = async (riderId: string) => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/riders/${riderId}/payment-qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentQr: draft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo guardar el QR.");
      }
      setQrByRider((current) => ({
        ...current,
        [riderId]: parseRiderPaymentQr(data?.rider?.paymentQrJson),
      }));
      setFeedback({ type: "ok", text: "QR de cobro guardado." });
      setEditingId(null);
    } catch (error: any) {
      setFeedback({
        type: "error",
        text: error?.message || "No se pudo guardar el QR.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Flota de Repartidores
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Conductores de delivery en Ivirgarzama. Carga el QR personal de
            cobro para que el cliente pueda pagarle desde el enlace del pedido.
          </p>
        </div>

        <div className="w-full sm:w-72">
          <Input
            placeholder="Buscar conductor o placa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>
      </div>

      {feedback && (
        <div
          className={`flex items-start gap-2 rounded-2xl border px-3 py-3 text-xs ${
            feedback.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {feedback.type === "ok" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Grid de Conductores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((r) => {
          const isMoto = r.vehicleType === "MOTO";
          const paymentQr = qrByRider[r.id];
          const isEditing = editingId === r.id;

          return (
            <Card key={r.id} className="hover:border-emerald-300 transition-all">
              <CardHeader className="bg-slate-50 pb-3 flex flex-row items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {isMoto ? "🛵 Motocicleta" : "🛺 Torito Trimóvil"}
                  </span>
                  <CardTitle className="text-base text-slate-900">{r.name}</CardTitle>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    r.isAvailable
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      r.isAvailable ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                    }`}
                  />
                  {r.isAvailable ? "En Turno" : "Fuera de Turno"}
                </span>
              </CardHeader>

              <CardContent className="p-4 space-y-3 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">
                    {r.vehicleModel || (isMoto ? "Bajaj Pulsar 150" : "Torito RE")}
                  </span>
                  <span className="font-mono text-[11px] font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                    {r.plateNumber}
                  </span>
                </div>

                <div className="space-y-1 text-[11px]">
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <a href={`tel:${r.phone}`} className="text-emerald-700 font-bold hover:underline">
                      {r.phone}
                    </a>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{r.city?.name || "Ivirgarzama"}</span>
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-[10px]">
                  <div className="p-1.5 rounded-lg bg-slate-50">
                    <span className="text-slate-400 block font-medium">Entregas</span>
                    <span className="text-xs font-bold text-slate-900">{r.totalDeliveries}</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-50">
                    <span className="text-slate-400 block font-medium">Carreras</span>
                    <span className="text-xs font-bold text-slate-900">{r.totalRides}</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-amber-50">
                    <span className="text-amber-700 block font-medium">Calificación</span>
                    <span className="text-xs font-black text-amber-900 flex items-center justify-center gap-0.5">
                      ★ {r.rating ? r.rating.toFixed(1) : "5.0"}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                        paymentQr ? "text-emerald-700" : "text-slate-400"
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      {paymentQr ? `QR: ${paymentQr.label}` : "Sin QR de cobro"}
                    </span>
                    <button
                      type="button"
                      onClick={() => (isEditing ? setEditingId(null) : openEditor(r))}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
                    >
                      {isEditing ? "Cerrar" : paymentQr ? "Editar QR" : "Cargar QR"}
                    </button>
                  </div>

                  {isEditing && (
                    <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={draft.label}
                          onChange={(e) =>
                            setDraft((current) => ({ ...current, label: e.target.value }))
                          }
                          placeholder="Billetera (Ej: Tigo Money)"
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[11px]"
                        />
                        <select
                          value={draft.type}
                          onChange={(e) =>
                            setDraft((current) => ({
                              ...current,
                              type: e.target.value as RiderPaymentQr["type"],
                            }))
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[11px]"
                        >
                          <option value="WALLET">Billetera digital</option>
                          <option value="QR">QR bancario</option>
                          <option value="BANK">Transferencia</option>
                          <option value="CASH">Efectivo</option>
                        </select>
                        <input
                          value={draft.accountName}
                          onChange={(e) =>
                            setDraft((current) => ({
                              ...current,
                              accountName: e.target.value,
                            }))
                          }
                          placeholder="Titular de la cuenta"
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[11px]"
                        />
                        <input
                          value={draft.accountNumber}
                          onChange={(e) =>
                            setDraft((current) => ({
                              ...current,
                              accountNumber: e.target.value,
                            }))
                          }
                          placeholder="Número / celular"
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[11px]"
                        />
                      </div>
                      <input
                        value={draft.instructions}
                        onChange={(e) =>
                          setDraft((current) => ({
                            ...current,
                            instructions: e.target.value,
                          }))
                        }
                        placeholder="Instrucciones para el cliente (opcional)"
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[11px]"
                      />

                      <div className="flex items-center gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[10px] font-bold text-slate-700">
                          <Upload className="h-3 w-3" />
                          Subir imagen del QR
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => readQrFile(e.target.files?.[0] || null)}
                          />
                        </label>
                        {draft.qrImage && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={draft.qrImage}
                            alt="Vista previa del QR"
                            className="h-10 w-10 rounded border border-slate-200 bg-white object-contain"
                          />
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => saveQr(r.id)}
                        disabled={saving}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-black text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {saving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        {saving ? "Guardando..." : "Guardar QR de cobro"}
                      </button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
