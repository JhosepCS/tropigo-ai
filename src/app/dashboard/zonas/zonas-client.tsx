"use client";

import { useState } from "react";
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
} from "lucide-react";

export function ZonasClient({
  cities,
  zones,
}: {
  cities: any[];
  zones: any[];
}) {
  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Zonas de Cobertura & Tarifas
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configuración geográfica y tarifaria oficial en Bolivianos (Bs.) para el Trópico de Cochabamba.
        </p>
      </div>

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
          {zones.map((z) => (
            <Card key={z.id} className="hover:border-emerald-300 transition-all">
              <CardHeader className="bg-slate-50 pb-3 flex flex-row items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Zona Tarifaria
                  </span>
                  <CardTitle className="text-base text-slate-900">{z.name}</CardTitle>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Activa
                </span>
              </CardHeader>

              <CardContent className="p-4 space-y-3 text-xs text-slate-600">
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200/60">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                      Tarifa Delivery
                    </span>
                    <span className="text-base font-black text-emerald-900">
                      {z.baseDeliveryCost.toFixed(2)} Bs.
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/60">
                    <span className="text-[10px] font-bold text-amber-800 uppercase block">
                      Tarifa Carrera
                    </span>
                    <span className="text-base font-black text-amber-900">
                      {z.baseRideCost.toFixed(2)} Bs.
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
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
