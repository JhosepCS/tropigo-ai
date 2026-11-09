"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Navigation,
  Phone,
  MapPin,
  CheckCircle2,
  Clock,
  ExternalLink,
  DollarSign,
  User,
  AlertCircle,
} from "lucide-react";

export function RiderRidesClient({
  initialRides,
  completedRides,
  riderId,
}: {
  initialRides: any[];
  completedRides: any[];
  riderId: string;
}) {
  const [activeRides, setActiveRides] = useState<any[]>(initialRides);
  const [historyRides, setHistoryRides] = useState<any[]>(completedRides);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleUpdateStatus = async (rideId: string, newStatus: string) => {
    setUpdatingId(rideId);
    try {
      const res = await fetch("/api/repartidor/update-ride-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rideId, status: newStatus, riderId }),
      });

      if (res.ok) {
        if (newStatus === "FINALIZADO") {
          const finished = activeRides.find((r) => r.id === rideId);
          setActiveRides((prev) => prev.filter((r) => r.id !== rideId));
          if (finished) {
            setHistoryRides((prev) => [{ ...finished, status: "FINALIZADO" }, ...prev]);
          }
        } else {
          setActiveRides((prev) =>
            prev.map((r) => (r.id === rideId ? { ...r, status: newStatus } : r))
          );
        }
      } else {
        alert("No se pudo actualizar el estado de la carrera.");
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión al actualizar carrera.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Superior de Carreras */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
            Servicio de Pasajeros
          </span>
          <h2 className="text-lg font-black tracking-tight mt-1">
            Carreras de Mototaxi & Torito
          </h2>
          <p className="text-xs text-amber-100">
            {activeRides.length === 0
              ? "Sin solicitudes de pasajeros en espera"
              : `Tienes ${activeRides.length} carrera(s) activa(s)`}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[11px] text-amber-100">Tarifa fija estándar</p>
          <p className="text-base font-black">4.00 - 5.00 Bs. / tramo</p>
        </div>
      </div>

      {/* Lista de Carreras Activas */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <span>Solicitudes de Pasajeros</span>
        </h3>

        {activeRides.length === 0 ? (
          <EmptyState
            icon={<Navigation className="w-8 h-8 text-amber-600" />}
            title="No hay pasajeros solicitando carrera"
            description="Cuando un usuario pida un mototaxi o torito en Ivirgarzama, la solicitud aparecerá aquí de inmediato."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeRides.map((ride) => {
              const isEnCurso = ride.status === "EN_CURSO";
              const isSubmitting = updatingId === ride.id;

              const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
                `${ride.originAddress}, Ivirgarzama`
              )}&destination=${encodeURIComponent(`${ride.destinationAddress}, Ivirgarzama`)}`;

              return (
                <Card key={ride.id} className="border-amber-200 shadow-xs">
                  <CardHeader className="bg-slate-50 pb-3 flex flex-row items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase">
                        Carrera de Pasajero
                      </span>
                      <CardTitle className="text-base font-black text-slate-900">
                        {ride.tripNumber}
                      </CardTitle>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                      {ride.status}
                    </span>
                  </CardHeader>

                  <CardContent className="p-4 space-y-3.5 text-xs">
                    {/* Datos del Pasajero */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">
                            {ride.customer?.name || "Pasajero"}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Vehículo: {ride.vehicleType === "TORITO_TRIMOVIL" ? "🛺 Torito" : "🛵 Moto"}
                          </p>
                        </div>
                      </div>

                      {ride.customer?.phone && (
                        <a
                          href={`tel:${ride.customer.phone}`}
                          className="text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          Llamar
                        </a>
                      )}
                    </div>

                    {/* Origen y Destino */}
                    <div className="space-y-2 border-l-2 border-amber-400 pl-3 ml-1">
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 block">
                          Punto de Partida
                        </span>
                        <p className="font-bold text-slate-900">{ride.originAddress}</p>
                      </div>

                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 block">
                          Destino Final
                        </span>
                        <p className="font-bold text-slate-900">{ride.destinationAddress}</p>
                      </div>
                    </div>

                    {/* Tarifa */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50/60 border border-amber-200 font-bold">
                      <span className="text-slate-600">Tarifa en Efectivo:</span>
                      <span className="text-sm font-black text-amber-900">
                        {ride.fareAmount ? ride.fareAmount.toFixed(2) : "4.00"} Bs.
                      </span>
                    </div>
                  </CardContent>

                  <CardFooter className="flex flex-col gap-2 pt-0">
                    <div className="grid grid-cols-2 gap-2 w-full">
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                      >
                        <Navigation className="w-3.5 h-3.5 text-slate-600" />
                        <span>Ver Ruta GPS</span>
                      </a>

                      {!isEnCurso ? (
                        <Button
                          variant="solar"
                          size="sm"
                          isLoading={isSubmitting}
                          onClick={() => handleUpdateStatus(ride.id, "EN_CURSO")}
                        >
                          🚀 Iniciar Carrera
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          isLoading={isSubmitting}
                          onClick={() => handleUpdateStatus(ride.id, "FINALIZADO")}
                          leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        >
                          Finalizar
                        </Button>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Historial de Carreras Finalizadas */}
      {historyRides.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
            <span>Carreras Realizadas Hoy ({historyRides.length})</span>
          </h3>

          <div className="space-y-2">
            {historyRides.map((ride) => (
              <div
                key={ride.id}
                className="p-3 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span>{ride.tripNumber}</span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                      Finalizada
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {ride.originAddress} ➔ {ride.destinationAddress}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-slate-900">
                    +{ride.fareAmount ? ride.fareAmount.toFixed(2) : "4.00"} Bs.
                  </span>
                  <p className="text-[10px] text-slate-400">Cobrado en efectivo</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
