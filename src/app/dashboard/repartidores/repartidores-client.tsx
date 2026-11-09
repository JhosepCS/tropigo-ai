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
} from "lucide-react";

export function RepartidoresClient({ riders }: { riders: any[] }) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = riders.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Flota de Repartidores & Mototaxis
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Conductores activos en Ivirgarzama para delivery de comidas y carreras de pasajeros.
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

      {/* Grid de Conductores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((r) => {
          const isMoto = r.vehicleType === "MOTO";

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
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
