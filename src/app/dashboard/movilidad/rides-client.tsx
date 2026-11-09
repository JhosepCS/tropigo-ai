"use client";

import { useState } from "react";
import {
  Navigation,
  Bike,
  User,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Phone,
  Plus,
  ChevronRight,
  ShieldCheck,
  Search,
} from "lucide-react";

interface RidesClientProps {
  initialTrips: any[];
  drivers: any[];
  business: any;
}

export function RidesClient({
  initialTrips,
  drivers,
  business,
}: RidesClientProps) {
  const [trips, setTrips] = useState<any[]>(initialTrips);
  const [selectedStatus, setSelectedStatus] = useState<string>("TODOS");
  const [searchQuery, setSearchQuery] = useState("");
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Formulario Nueva Carrera Manual
  const [manualPassengerName, setManualPassengerName] = useState("");
  const [manualPassengerPhone, setManualPassengerPhone] = useState("");
  const [manualOrigin, setManualOrigin] = useState("");
  const [manualDestination, setManualDestination] = useState("");
  const [manualVehicle, setManualVehicle] = useState<"MOTO" | "TORITO">("MOTO");
  const [manualFare, setManualFare] = useState(4.0);
  const [isCreatingRide, setIsCreatingRide] = useState(false);

  const statusConfig: Record<string, { label: string; color: string }> = {
    SOLICITADO: {
      label: "Solicitado (Buscando conductor)",
      color: "bg-blue-50 text-blue-700 border-blue-200",
    },
    CONDUCTOR_ASIGNADO: {
      label: "Conductor Asignado",
      color: "bg-amber-50 text-amber-700 border-amber-200",
    },
    EN_CURSO: {
      label: "En Viaje a Destino",
      color: "bg-purple-50 text-purple-700 border-purple-200",
    },
    FINALIZADO: {
      label: "Carrera Finalizada",
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    CANCELADO: {
      label: "Cancelado",
      color: "bg-red-50 text-red-700 border-red-200",
    },
  };

  const handleAssignDriver = async (tripId: string, riderId: string) => {
    const selectedDriver = drivers.find((d) => d.id === riderId);
    setTrips((prev) =>
      prev.map((t) =>
        t.id === tripId
          ? {
              ...t,
              assignedRiderId: riderId,
              assignedRider: selectedDriver,
              status: "CONDUCTOR_ASIGNADO",
            }
          : t
      )
    );

    try {
      await fetch("/api/rides/assign-driver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId, riderId }),
      });
    } catch (e) {
      console.error("Error al asignar conductor:", e);
    }
  };

  const handleUpdateStatus = async (tripId: string, status: string) => {
    setTrips((prev) =>
      prev.map((t) => (t.id === tripId ? { ...t, status } : t))
    );

    try {
      await fetch("/api/rides/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId, status }),
      });
    } catch (e) {
      console.error("Error al cambiar estado de carrera:", e);
    }
  };

  const handleCreateManualRide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPassengerPhone || !manualOrigin || !manualDestination) return;

    setIsCreatingRide(true);
    try {
      const res = await fetch("/api/public/rides/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passengerName: manualPassengerName || "Pasajero",
          passengerPhone: manualPassengerPhone,
          originAddress: manualOrigin,
          destinationAddress: manualDestination,
          vehicleType: manualVehicle,
          fareAmount: manualFare,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newTrip = {
          id: data.tripId,
          tripNumber: data.tripNumber,
          customer: { name: manualPassengerName, phone: manualPassengerPhone },
          originAddress: manualOrigin,
          destinationAddress: manualDestination,
          vehicleType: manualVehicle,
          fareAmount: manualFare,
          paymentMethod: "EFECTIVO",
          status: "SOLICITADO",
          createdAt: new Date().toISOString(),
        };
        setTrips((prev) => [newTrip, ...prev]);
        setIsManualModalOpen(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingRide(false);
    }
  };

  const filteredTrips = trips.filter((t) => {
    if (selectedStatus !== "TODOS" && t.status !== selectedStatus) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const matchNumber = t.tripNumber.toLowerCase().includes(q);
    const matchPassenger = t.customer?.name?.toLowerCase().includes(q) || false;
    const matchDest = t.destinationAddress?.toLowerCase().includes(q) || false;
    return matchNumber || matchPassenger || matchDest;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-[#101828]">
              Despacho de Mototaxis & Toritos
            </h1>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              Ivirgarzama Movilidad
            </span>
          </div>
          <p className="text-xs text-[#667085] mt-0.5">
            Asignación de carreras urbanas e interprovinciales con tarifas calculadas en Bs.
          </p>
        </div>

        <button
          onClick={() => setIsManualModalOpen(true)}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Carrera Manual</span>
        </button>
      </div>

      {/* Filtros y Buscador */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {["TODOS", "SOLICITADO", "CONDUCTOR_ASIGNADO", "EN_CURSO", "FINALIZADO"].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                selectedStatus === st
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-[#475467] border border-[#EAECF0] hover:bg-[#F2F4F7]"
              }`}
            >
              {st === "TODOS"
                ? "Todas las Carreras"
                : statusConfig[st]?.label.split("(")[0].trim() || st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[#98A2B3] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por código o destino..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#D0D5DD] rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Lista de Carreras */}
      <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-xs overflow-hidden">
        {filteredTrips.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#98A2B3] space-y-2">
            <Navigation className="w-8 h-8 text-[#D0D5DD] mx-auto" />
            <p className="font-bold text-[#344054]">No hay carreras registradas</p>
            <p>Las solicitudes de mototaxi de WhatsApp y la web aparecerán aquí.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#EAECF0]">
            {filteredTrips.map((trip) => {
              const cfg = statusConfig[trip.status] || {
                label: trip.status,
                color: "bg-gray-100 text-gray-800",
              };

              return (
                <div
                  key={trip.id}
                  className="p-4 sm:p-5 hover:bg-[#F9FAFB] transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs"
                >
                  {/* Datos del Viaje */}
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-xs text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {trip.tripNumber}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${cfg.color}`}
                      >
                        {cfg.label}
                      </span>
                      <span className="text-[10px] text-[#98A2B3]">
                        {new Date(trip.createdAt).toLocaleTimeString("es-BO", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm font-bold text-[#101828]">
                      <User className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{trip.customer?.name || "Pasajero WhatsApp"}</span>
                      <span className="text-xs text-[#667085] font-normal">
                        ({trip.customer?.phone})
                      </span>
                    </div>

                    {/* Ruta Origen -> Destino */}
                    <div className="flex items-center gap-2 text-xs text-[#344054]">
                      <div className="flex items-center gap-1 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">{trip.originAddress}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-[#98A2B3] shrink-0" />
                      <div className="flex items-center gap-1 font-bold text-[#101828]">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{trip.destinationAddress}</span>
                      </div>
                    </div>
                  </div>

                  {/* Vehículo y Tarifa */}
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <span className="text-[11px] font-bold text-[#667085] block">
                        {trip.vehicleType === "TORITO" ? "🛺 Torito / Trimóvil" : "🛵 Mototaxi"}
                      </span>
                      <span className="font-black text-base text-emerald-700">
                        {trip.fareAmount.toFixed(2)} Bs.
                      </span>
                    </div>

                    {/* Selector de Conductor */}
                    <div className="w-48 text-left space-y-1">
                      <select
                        value={trip.assignedRiderId || ""}
                        onChange={(e) =>
                          handleAssignDriver(trip.id, e.target.value)
                        }
                        className="w-full text-[11px] bg-[#F2F4F7] border border-[#D0D5DD] rounded-xl px-2 py-1.5 text-[#101828] font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="">-- Asignar Conductor --</option>
                        {drivers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.vehicleType} - {d.plateNumber})
                          </option>
                        ))}
                      </select>

                      {/* Botón de Siguiente Estado */}
                      {trip.status === "CONDUCTOR_ASIGNADO" && (
                        <button
                          onClick={() => handleUpdateStatus(trip.id, "EN_CURSO")}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] py-1 rounded-lg"
                        >
                          Iniciar Viaje
                        </button>
                      )}
                      {trip.status === "EN_CURSO" && (
                        <button
                          onClick={() => handleUpdateStatus(trip.id, "FINALIZADO")}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] py-1 rounded-lg"
                        >
                          Finalizar Carrera
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Nueva Carrera Manual */}
      {isManualModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-2xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#EAECF0] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#EAECF0]">
              <h3 className="font-bold text-sm text-[#101828]">
                Registrar Carrera de Mototaxi Manual
              </h3>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="text-[#667085] hover:text-[#101828]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManualRide} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-[#344054]">Nombre Pasajero</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Marcelo Rojas"
                    value={manualPassengerName}
                    onChange={(e) => setManualPassengerName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#D0D5DD] rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#344054]">WhatsApp</label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej: 71239845"
                    value={manualPassengerPhone}
                    onChange={(e) => setManualPassengerPhone(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#D0D5DD] rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#344054]">Punto de Partida (Origen)</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Mercado Central de Ivirgarzama"
                  value={manualOrigin}
                  onChange={(e) => setManualOrigin(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#D0D5DD] rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#344054]">Punto de Llegada (Destino)</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Sindicato San Salvador, Villa 14"
                  value={manualDestination}
                  onChange={(e) => setManualDestination(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#D0D5DD] rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-[#344054]">Vehículo</label>
                  <select
                    value={manualVehicle}
                    onChange={(e) => {
                      const v = e.target.value as "MOTO" | "TORITO";
                      setManualVehicle(v);
                      setManualFare(v === "MOTO" ? 4.0 : 5.0);
                    }}
                    className="w-full px-3 py-1.5 border border-[#D0D5DD] rounded-xl font-medium"
                  >
                    <option value="MOTO">🛵 Mototaxi</option>
                    <option value="TORITO">🛺 Torito</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#344054]">Tarifa (Bs.)</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={manualFare}
                    onChange={(e) => setManualFare(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-[#D0D5DD] rounded-xl font-bold text-emerald-800"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="flex-1 py-2 border border-[#D0D5DD] rounded-xl text-[#344054] font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingRide}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                >
                  {isCreatingRide ? "Guardando..." : "Crear Carrera"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
