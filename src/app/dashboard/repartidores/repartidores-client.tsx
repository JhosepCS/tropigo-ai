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
  UserCheck,
  UserX,
  Send,
  Copy,
  ExternalLink,
  Clock3,
} from "lucide-react";
import {
  emptyRiderPaymentQr,
  parseRiderPaymentQr,
  RiderPaymentQr,
} from "@/lib/payments/rider";

const MAX_QR_BYTES = 1_200_000;

export function RepartidoresClient({ riders }: { riders: any[] }) {
  const [ridersState, setRidersState] = useState<any[]>(riders);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RiderPaymentQr>(emptyRiderPaymentQr());
  const [saving, setSaving] = useState(false);
  const [statusBusy, setStatusBusy] = useState<string | null>(null);
  const [accessLinks, setAccessLinks] = useState<Record<string, string>>({});
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

  const filtered = ridersState.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(r.plateNumber || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(r.phone || "").includes(searchQuery)
  );

  const pendingCount = ridersState.filter(
    (r) => r.status === "PENDIENTE_APROBACION"
  ).length;

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

  const changeStatus = async (riderId: string, action: string) => {
    setStatusBusy(`${riderId}:${action}`);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/riders/${riderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo actualizar al repartidor.");
      }

      const nextStatus =
        data?.status ||
        (action === "approve"
          ? "ACTIVO"
          : action === "reject"
          ? "RECHAZADO"
          : action === "suspend"
          ? "SUSPENDIDO"
          : undefined);

      setRidersState((prev) =>
        prev.map((rider) =>
          rider.id === riderId
            ? {
                ...rider,
                status: nextStatus || rider.status,
                isActive:
                  nextStatus === "ACTIVO" ? true : nextStatus ? false : rider.isActive,
                isAvailable:
                  nextStatus === "ACTIVO"
                    ? rider.isAvailable
                    : nextStatus
                    ? false
                    : rider.isAvailable,
              }
            : rider
        )
      );

      if (data?.accessUrl) {
        setAccessLinks((prev) => ({ ...prev, [riderId]: data.accessUrl }));
        try {
          await navigator.clipboard?.writeText(data.accessUrl);
        } catch {
          // El portapapeles puede estar bloqueado; el enlace igual se muestra.
        }
      }

      const messages: Record<string, string> = {
        approve: "Repartidor aprobado. Se envió su enlace de acceso por WhatsApp.",
        reject: "Registro rechazado. El repartidor puede escribir para más detalles.",
        suspend: "Repartidor suspendido. Ya no recibirá carreras.",
        "send-link": "Enlace de acceso enviado por WhatsApp.",
        "regenerate-link":
          "Enlace regenerado. El anterior quedó revocado y el nuevo se copió al portapapeles.",
      };
      setFeedback({
        type: "ok",
        text: messages[action] || "Repartidor actualizado.",
      });
    } catch (error: any) {
      setFeedback({
        type: "error",
        text: error?.message || "No se pudo actualizar al repartidor.",
      });
    } finally {
      setStatusBusy(null);
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
            Conductores de delivery en Ivirgarzama. Aprueba los registros web,
            envía su enlace por WhatsApp y carga el QR personal de cobro.
          </p>
          <a
            href="/registro/repartidor"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100"
          >
            <ExternalLink className="h-3 w-3" />
            Abrir formulario público de registro
          </a>
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

      {pendingCount > 0 && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs font-semibold text-amber-900">
          <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {pendingCount} solicitud(es) de repartidores esperando aprobación.
            Revisa nombre, vehículo y QR de cobro antes de aprobar.
          </span>
        </div>
      )}

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
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                    r.status === "PENDIENTE_APROBACION"
                      ? "bg-amber-100 text-amber-800 border-amber-200"
                      : r.status === "RECHAZADO" || r.status === "SUSPENDIDO"
                      ? "bg-red-50 text-red-700 border-red-200"
                      : r.isAvailable
                      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      r.status === "PENDIENTE_APROBACION"
                        ? "bg-amber-500"
                        : r.status === "RECHAZADO" || r.status === "SUSPENDIDO"
                        ? "bg-red-500"
                        : r.isAvailable
                        ? "bg-emerald-500 animate-pulse"
                        : "bg-slate-400"
                    }`}
                  />
                  {r.status === "PENDIENTE_APROBACION"
                    ? "Pendiente"
                    : r.status === "RECHAZADO"
                    ? "Rechazado"
                    : r.status === "SUSPENDIDO"
                    ? "Suspendido"
                    : r.isAvailable
                    ? "En Turno"
                    : "Fuera de Turno"}
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

                <div className="space-y-2 border-t border-slate-100 pt-2">
                  {r.status === "PENDIENTE_APROBACION" ? (
                    <>
                      <p className="text-[10px] font-black uppercase tracking-wide text-amber-700">
                        Solicitud desde la web
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => changeStatus(r.id, "approve")}
                          disabled={statusBusy === `${r.id}:approve`}
                          className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2 py-2 text-[10px] font-black text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {statusBusy === `${r.id}:approve` ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <UserCheck className="h-3 w-3" />
                          )}
                          Aprobar y avisar
                        </button>
                        <button
                          type="button"
                          onClick={() => changeStatus(r.id, "reject")}
                          disabled={statusBusy === `${r.id}:reject`}
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-2 text-[10px] font-black text-red-700 hover:bg-red-100 disabled:opacity-60"
                        >
                          {statusBusy === `${r.id}:reject` ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <UserX className="h-3 w-3" />
                          )}
                          Rechazar
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => changeStatus(r.id, "send-link")}
                          disabled={statusBusy === `${r.id}:send-link`}
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-2 text-[10px] font-black text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
                        >
                          {statusBusy === `${r.id}:send-link` ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3" />
                          )}
                          Enviar enlace
                        </button>
                        <button
                          type="button"
                          onClick={() => changeStatus(r.id, "regenerate-link")}
                          disabled={statusBusy === `${r.id}:regenerate-link`}
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                        >
                          {statusBusy === `${r.id}:regenerate-link` ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <QrCode className="h-3 w-3" />
                          )}
                          Regenerar
                        </button>
                      </div>
                      {r.status === "SUSPENDIDO" || r.status === "RECHAZADO" ? (
                        <button
                          type="button"
                          onClick={() => changeStatus(r.id, "approve")}
                          disabled={statusBusy === `${r.id}:approve`}
                          className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2 py-1.5 text-[10px] font-black text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          <UserCheck className="h-3 w-3" />
                          Reactivar repartidor
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => changeStatus(r.id, "suspend")}
                          disabled={statusBusy === `${r.id}:suspend`}
                          className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] font-bold text-slate-500 hover:border-red-200 hover:text-red-700 disabled:opacity-60"
                        >
                          <UserX className="h-3 w-3" />
                          Suspender
                        </button>
                      )}
                    </>
                  )}

                  {accessLinks[r.id] && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                      <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                        Enlace de acceso
                      </p>
                      <div className="flex items-center gap-1">
                        <a
                          href={accessLinks[r.id]}
                          target="_blank"
                          rel="noreferrer"
                          className="min-w-0 flex-1 truncate text-[10px] font-semibold text-emerald-700 hover:underline"
                        >
                          {accessLinks[r.id]}
                        </a>
                        <button
                          type="button"
                          onClick={() => navigator.clipboard?.writeText(accessLinks[r.id])}
                          className="shrink-0 rounded p-1 text-slate-500 hover:bg-white"
                          aria-label="Copiar enlace"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
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
