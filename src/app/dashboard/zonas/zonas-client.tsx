"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  MapPin,
  Compass,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Building2,
  Navigation,
  Pencil,
  Save,
  X,
  Loader2,
} from "lucide-react";

export function ZonasClient({
  cities,
  zones,
  minRideFare,
}: {
  cities: any[];
  zones: any[];
  minRideFare: number;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deliveryCost, setDeliveryCost] = useState("");
  const [rideCost, setRideCost] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const startEdit = (zone: any) => {
    setEditingId(zone.id);
    setDeliveryCost(String(zone.baseDeliveryCost ?? ""));
    setRideCost(String(zone.baseRideCost ?? ""));
    setEstimatedMinutes(String(zone.estimatedMinutes ?? 25));
    setError(null);
    setSuccess(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setError(null);
  };

  const saveEdit = async (zoneId: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/zones/${zoneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseDeliveryCost: Number(deliveryCost),
          baseRideCost: Number(rideCost),
          estimatedMinutes: Number(estimatedMinutes),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "No se pudieron guardar las tarifas.");
      }
      setEditingId(null);
      setSuccess("Tarifas de la zona actualizadas correctamente.");
      router.refresh();
      setTimeout(() => setSuccess(null), 3500);
    } catch (e: any) {
      setError(e.message || "No se pudieron guardar las tarifas.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Zonas de Cobertura & Tarifas
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configuración geográfica y tarifaria oficial en Bolivianos (Bs.) para el
          Trópico de Cochabamba.
        </p>
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-[11px] font-semibold text-amber-800">
          <DollarSign className="w-3.5 h-3.5" />
          Tarifa mínima de carrera: {minRideFare.toFixed(2)} Bs. (no se puede reducir)
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-[11px] text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-[11px] text-emerald-700">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* 1. Localidades del Trópico */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Localidades del Trópico de Cochabamba</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {cities.map((city) => (
            <div
              key={city.id}
              className={`p-4 rounded-2xl border transition-all ${
                city.isActive
                  ? "bg-white border-emerald-300 shadow-2xs"
                  : "bg-slate-50/70 border-slate-200 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg">🌴</span>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    city.isActive
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {city.isActive ? "Operación Activa" : "Próxima Expansión"}
                </span>
              </div>
              <h4 className="font-black text-slate-900 text-sm mt-2">{city.name}</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {city.department || "Cochabamba"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Zonas Tarifarias de Ivirgarzama */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
          <span>Zonas y Tarifas Activas (Ivirgarzama)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones.map((z) => {
            const isEditing = editingId === z.id;

            return (
              <Card key={z.id} className="hover:border-emerald-300 transition-all">
                <CardHeader className="bg-slate-50 pb-3 flex flex-row items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Zona Tarifaria
                    </span>
                    <CardTitle className="text-base text-slate-900">{z.name}</CardTitle>
                  </div>
                  {isEditing ? (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70"
                      title="Cancelar edición"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(z)}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2 py-1 text-[10px] font-bold text-emerald-700 hover:bg-emerald-50"
                    >
                      <Pencil className="w-3 h-3" />
                      Editar
                    </button>
                  )}
                </CardHeader>

                <CardContent className="p-4 space-y-3 text-xs text-slate-600">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-emerald-800 uppercase">
                            Delivery (Bs.)
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={0.5}
                            value={deliveryCost}
                            onChange={(e) => setDeliveryCost(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-bold text-slate-900"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-amber-800 uppercase">
                            Carrera (Bs.)
                          </label>
                          <input
                            type="number"
                            min={minRideFare}
                            step={0.5}
                            value={rideCost}
                            onChange={(e) => setRideCost(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-bold text-slate-900"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">
                          Tiempo estimado (min)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={240}
                          step={1}
                          value={estimatedMinutes}
                          onChange={(e) => setEstimatedMinutes(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-bold text-slate-900"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => saveEdit(z.id)}
                        disabled={saving}
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {saving ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        {saving ? "Guardando..." : "Guardar tarifas"}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200/60">
                          <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                            Tarifa Delivery
                          </span>
                          <span className="text-base font-black text-emerald-900">
                            {Number(z.baseDeliveryCost).toFixed(2)} Bs.
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/60">
                          <span className="text-[10px] font-bold text-amber-800 uppercase block">
                            Tarifa Carrera
                          </span>
                          <span className="text-base font-black text-amber-900">
                            {Number(z.baseRideCost).toFixed(2)} Bs.
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                        <span className="flex items-center gap-1 text-slate-500 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Tiempo estimado:
                        </span>
                        <span className="font-bold text-slate-800">
                          ~{z.estimatedMinutes || 25} minutos
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
