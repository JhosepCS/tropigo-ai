"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
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
  Plus,
  ExternalLink,
  LocateFixed,
  Map as MapIcon,
  Trash2,
  Search,
} from "lucide-react";

const OFFICIAL_CENTER = {
  lat: -17.035028123456595,
  lng: -64.86009805670489,
  title: "Plaza Principal de Ivirgarzama (Centro Oficial)",
};

const TERRAIN_BADGES: Record<string, { label: string; cls: string }> = {
  FACIL: {
    label: "🟢 Terreno Fácil",
    cls: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  MEDIA: {
    label: "🟡 Dificultad Media",
    cls: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  ALTA: {
    label: "🔴 Dificultad Alta",
    cls: "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  },
};

function parseZoneGeo(zone: any): {
  category: string;
  latitude: number | null;
  longitude: number | null;
  streets: string;
  terrainDifficulty: string;
  terrainNote: string;
  distanceKm: number | null;
} {
  if (!zone?.polygonGeoJson) {
    return {
      category: "GENERAL",
      latitude: null,
      longitude: null,
      streets: "",
      terrainDifficulty: "FACIL",
      terrainNote: "",
      distanceKm: null,
    };
  }
  try {
    const parsed = JSON.parse(zone.polygonGeoJson);
    return {
      category: String(parsed?.category || "GENERAL").toUpperCase(),
      latitude: typeof parsed?.latitude === "number" ? parsed.latitude : null,
      longitude: typeof parsed?.longitude === "number" ? parsed.longitude : null,
      streets: String(parsed?.streets || ""),
      terrainDifficulty: String(parsed?.terrainDifficulty || "FACIL").toUpperCase(),
      terrainNote: String(parsed?.terrainNote || ""),
      distanceKm: typeof parsed?.distanceKm === "number" ? parsed.distanceKm : null,
    };
  } catch {
    return {
      category: "GENERAL",
      latitude: null,
      longitude: null,
      streets: "",
      terrainDifficulty: "FACIL",
      terrainNote: "",
      distanceKm: null,
    };
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  TODAS: "Todas las zonas",
  RESIDENCIAL: "🏘️ Residencial / Barrio",
  HOTEL: "🏨 Hotel / Hospedaje",
  MERCADO: "🛒 Mercado / Comercio",
  HOSPITAL: "🏥 Hospital / Salud",
  TERMINAL: "🚌 Terminal / Transporte",
  GENERAL: "📍 Zona urbana general",
};

function getZoneCategory(zone: any): string {
  if (!zone?.polygonGeoJson) return "GENERAL";
  try {
    const parsed = JSON.parse(zone.polygonGeoJson);
    return String(parsed?.category || "GENERAL").toUpperCase();
  } catch {
    return "GENERAL";
  }
}

export function ZonasClient({
  cities,
  zones: initialZones,
  minRideFare,
}: {
  cities: any[];
  zones: any[];
  minRideFare: number;
}) {
  const router = useRouter();
  const [zones, setZones] = useState<any[]>(initialZones);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editStreets, setEditStreets] = useState("");
  const [editDifficulty, setEditDifficulty] = useState("FACIL");
  const [editLat, setEditLat] = useState("");
  const [editLng, setEditLng] = useState("");
  const [deliveryCost, setDeliveryCost] = useState("");
  const [rideCost, setRideCost] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal para crear nueva zona
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");
  const [newCityId, setNewCityId] = useState(cities[0]?.id || "");
  const [newDeliveryCost, setNewDeliveryCost] = useState("5");
  const [newRideCost, setNewRideCost] = useState(String(minRideFare));
  const [newMinutes, setNewMinutes] = useState("15");
  const [newDescription, setNewDescription] = useState("");
  const [newStreets, setNewStreets] = useState("");
  const [newTerrainDifficulty, setNewTerrainDifficulty] = useState("FACIL");
  const [newCategory, setNewCategory] = useState("RESIDENCIAL");
  const [newLat, setNewLat] = useState<number | "">(OFFICIAL_CENTER.lat);
  const [newLng, setNewLng] = useState<number | "">(OFFICIAL_CENTER.lng);
  const [geoLocating, setGeoLocating] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("TODAS");
  const [difficultyFilter, setDifficultyFilter] = useState("TODAS");
  const [searchTerm, setSearchTerm] = useState("");

  // Mapa interactivo seleccionado
  const [selectedMapCoords, setSelectedMapCoords] = useState<{
    lat: number;
    lng: number;
    title: string;
  } | null>(OFFICIAL_CENTER);

  const filteredZones = zones.filter((zone) => {
    const geo = parseZoneGeo(zone);
    if (categoryFilter !== "TODAS" && geo.category !== categoryFilter) return false;
    if (difficultyFilter !== "TODAS" && geo.terrainDifficulty !== difficultyFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      const hay = `${zone.name || ""} ${zone.description || ""} ${geo.streets || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const startEdit = (zone: any) => {
    const geo = parseZoneGeo(zone);
    setEditingId(zone.id);
    setEditName(String(zone.name ?? ""));
    setEditStreets(geo.streets || "");
    setEditDifficulty(geo.terrainDifficulty || "FACIL");
    setEditLat(geo.latitude !== null ? String(geo.latitude) : "");
    setEditLng(geo.longitude !== null ? String(geo.longitude) : "");
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
          name: editName,
          streets: editStreets,
          terrainDifficulty: editDifficulty,
          latitude: editLat.trim() ? Number(editLat) : undefined,
          longitude: editLng.trim() ? Number(editLng) : undefined,
          baseDeliveryCost: Number(deliveryCost),
          baseRideCost: Number(rideCost),
          estimatedMinutes: Number(estimatedMinutes),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "No se pudieron guardar las tarifas.");
      }
      setZones((prev) =>
        prev.map((z) => (z.id === zoneId ? { ...z, ...data.zone } : z))
      );
      setEditingId(null);
      setSuccess("Zona y tarifas actualizadas correctamente.");
      router.refresh();
      setTimeout(() => setSuccess(null), 3500);
    } catch (e: any) {
      setError(e.message || "No se pudieron guardar las tarifas.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteZone = async (zone: any) => {
    if (!confirm(`¿Seguro que deseas eliminar "${zone.name}" del mapa de tarifas?`)) {
      return;
    }
    setDeletingId(zone.id);
    setError(null);
    try {
      const res = await fetch(`/api/zones/${zone.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "No se pudo eliminar la zona.");
      setZones((prev) => prev.filter((z) => z.id !== zone.id));
      setSuccess(
        data?.deactivated
          ? `"${zone.name}" tenía pedidos históricos y fue desactivada.`
          : `"${zone.name}" eliminada del mapa.`
      );
      router.refresh();
      setTimeout(() => setSuccess(null), 3500);
    } catch (e: any) {
      setError(e.message || "No se pudo eliminar la zona.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleGetMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Tu navegador no soporta geolocalización.");
      return;
    }
    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNewLat(Number(pos.coords.latitude.toFixed(6)));
        setNewLng(Number(pos.coords.longitude.toFixed(6)));
        setGeoLocating(false);
      },
      (err) => {
        alert("No se pudo obtener la ubicación GPS: " + err.message);
        setGeoLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newZoneName,
          cityId: newCityId,
          description: newDescription,
          baseDeliveryCost: Number(newDeliveryCost),
          baseRideCost: Number(newRideCost),
          estimatedMinutes: Number(newMinutes),
          category: newCategory,
          streets: newStreets,
          terrainDifficulty: newTerrainDifficulty,
          latitude: typeof newLat === "number" ? newLat : null,
          longitude: typeof newLng === "number" ? newLng : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear la zona");

      setZones((prev) => [...prev, data.zone]);
      setIsModalOpen(false);
      setNewZoneName("");
      setNewDescription("");
      setNewStreets("");
      setSuccess("Nueva zona registrada exitosamente.");
      router.refresh();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message || "Error al registrar la zona");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 tracking-wider uppercase bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            Logística & Cobertura Geográfica
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1.5">
            Zonas de Cobertura & Tarifas
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configuración geográfica con Google Maps y tarifas oficiales en Bolivianos (Bs.) para el Trópico.
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-3 py-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
            <DollarSign className="w-3.5 h-3.5" />
            Tarifa mínima de carrera: {minRideFare.toFixed(2)} Bs. (no se puede reducir)
          </div>
        </div>

        <div>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsModalOpen(true)}
            className="shadow-sm"
          >
            Registrar Nueva Zona
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 px-3 py-2 text-[11px] text-red-700 dark:text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 px-3 py-2 text-[11px] text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* 1. Visor de Google Maps Integrado dentro de la página */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <MapIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Visor Satelital y Callejero (Google Maps)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {selectedMapCoords?.title || "Plaza Principal de Ivirgarzama"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedMapCoords(OFFICIAL_CENTER)}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
            >
              Centrar en Plaza Principal
            </button>
            {selectedMapCoords && (
              <a
                href={`https://www.google.com/maps?q=${selectedMapCoords.lat},${selectedMapCoords.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline px-2"
              >
                <span>Abrir en Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Embebido interactivo de Google Maps */}
        <div className="w-full h-64 sm:h-80 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner">
          <iframe
            title="Google Maps Ivirgarzama"
            width="100%"
            height="100%"
            frameBorder="0"
            scrolling="no"
            src={`https://maps.google.com/maps?q=${
              selectedMapCoords ? `${selectedMapCoords.lat},${selectedMapCoords.lng}` : `${OFFICIAL_CENTER.lat},${OFFICIAL_CENTER.lng}`
            }&z=15&output=embed`}
          />
        </div>
      </div>

      {/* 2. Localidades del Trópico */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Localidades del Trópico de Cochabamba</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {cities.map((city) => (
            <div
              key={city.id}
              className={`p-4 rounded-2xl border transition-all ${
                city.isActive
                  ? "bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-800 shadow-2xs"
                  : "bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg">🌴</span>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    city.isActive
                      ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {city.isActive ? "Operación Activa" : "Próxima Expansión"}
                </span>
              </div>
              <h4 className="font-black text-slate-900 dark:text-white text-sm mt-2">{city.name}</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {city.department || "Cochabamba"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Zonas Tarifarias de Ivirgarzama */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>Zonas y Tarifas Activas ({filteredZones.length} de {zones.length} zonas)</span>
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar calle, barrio o comercio..."
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-52"
              />
            </div>
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="TODAS">Toda dificultad</option>
              <option value="FACIL">🟢 Terreno Fácil</option>
              <option value="MEDIA">🟡 Dificultad Media</option>
              <option value="ALTA">🔴 Dificultad Alta</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredZones.map((z) => {
            const isEditing = editingId === z.id;
            const geo = parseZoneGeo(z);
            const zoneCategory = geo.category;
            const terrainInfo = TERRAIN_BADGES[geo.terrainDifficulty] || TERRAIN_BADGES.FACIL;
            const coords =
              geo.latitude !== null && geo.longitude !== null
                ? { latitude: geo.latitude, longitude: geo.longitude }
                : null;

            return (
              <Card key={z.id} className="hover:border-emerald-300 dark:hover:border-emerald-700 transition-all flex flex-col justify-between">
                <CardHeader className="bg-slate-50/70 dark:bg-slate-800/40 pb-3 flex flex-row items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        {CATEGORY_LABELS[zoneCategory] || "Zona Tarifaria"}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${terrainInfo.cls}`}>
                        {terrainInfo.label}
                      </span>
                    </div>
                    <CardTitle className="text-base text-slate-900 dark:text-white">{z.name}</CardTitle>
                  </div>
                  {isEditing ? (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700"
                      title="Cancelar edición"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(z)}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-800 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                      >
                        <Pencil className="w-3 h-3" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteZone(z)}
                        disabled={deletingId === z.id}
                        className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50"
                        title="Eliminar ubicación"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="p-4 space-y-3 text-xs text-slate-600 dark:text-slate-300">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Nombre / Ubicación</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Calles / Referencias</label>
                        <input
                          type="text"
                          value={editStreets}
                          onChange={(e) => setEditStreets(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase">
                            Delivery (Bs.)
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={0.5}
                            value={deliveryCost}
                            onChange={(e) => setDeliveryCost(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm font-bold text-slate-900 dark:text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase">
                            Carrera (Bs.)
                          </label>
                          <input
                            type="number"
                            min={minRideFare}
                            step={0.5}
                            value={rideCost}
                            onChange={(e) => setRideCost(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm font-bold text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">
                            Dificultad Terreno
                          </label>
                          <select
                            value={editDifficulty}
                            onChange={(e) => setEditDifficulty(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs font-bold text-slate-900 dark:text-white"
                          >
                            <option value="FACIL">🟢 Fácil</option>
                            <option value="MEDIA">🟡 Media</option>
                            <option value="ALTA">🔴 Alta</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">
                            Tiempo (min)
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={240}
                            step={1}
                            value={estimatedMinutes}
                            onChange={(e) => setEstimatedMinutes(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm font-bold text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Latitud</label>
                          <input
                            type="text"
                            value={editLat}
                            onChange={(e) => setEditLat(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-[11px] font-mono text-slate-900 dark:text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Longitud</label>
                          <input
                            type="text"
                            value={editLng}
                            onChange={(e) => setEditLng(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-[11px] font-mono text-slate-900 dark:text-white"
                          />
                        </div>
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
                        {saving ? "Guardando..." : "Guardar cambios"}
                      </button>
                    </div>
                  ) : (
                    <>
                      {geo.streets && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                          🛣️ {geo.streets}
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60">
                          <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase block">
                            Tarifa Delivery
                          </span>
                          <span className="text-base font-black text-emerald-900 dark:text-emerald-300">
                            {Number(z.baseDeliveryCost).toFixed(2)} Bs.
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60">
                          <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase block">
                            Tarifa Carrera
                          </span>
                          <span className="text-base font-black text-amber-900 dark:text-amber-300">
                            {Number(z.baseRideCost).toFixed(2)} Bs.
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                        <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {geo.distanceKm !== null ? `${geo.distanceKm} km · ` : ""}~{z.estimatedMinutes || 25} min
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {geo.terrainNote || (z.city?.name || "Ivirgarzama")}
                        </span>
                      </div>

                      {/* Coordenadas o botón para ver en el visor */}
                      <div className="pt-1 flex items-center justify-between">
                        {coords ? (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedMapCoords({
                                lat: coords.latitude,
                                lng: coords.longitude,
                                title: z.name,
                              })
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                          >
                            <MapPin className="w-3 h-3" />
                            <span>Ver en Google Maps</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">Radio céntrico</span>
                        )}

                        <span className="text-[10px] font-semibold text-slate-400">
                          {z.city?.name || "Ivirgarzama"}
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

      {/* Modal para Registrar Nueva Zona con Google Maps */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Nueva Zona de Cobertura"
        description="Fija el nombre, tarifas oficiales en Bs. y ubicación en Google Maps para Ivirgarzama."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateZone} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-200">Nombre de la Zona *</label>
              <input
                type="text"
                required
                placeholder="Ej: Villa 14, Senda III, Casco Viejo"
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-200">Tipo de Zona / Cobertura *</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="RESIDENCIAL">🏘️ Residencial / Barrio</option>
                <option value="HOTEL">🏨 Hotel / Hospedaje</option>
                <option value="MERCADO">🛒 Mercado / Centro Comercial</option>
                <option value="HOSPITAL">🏥 Hospital / Salud</option>
                <option value="TERMINAL">🚌 Terminal / Transporte</option>
                <option value="GENERAL">📍 Zona Urbana General</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-200">Localidad *</label>
              <select
                value={newCityId}
                onChange={(e) => setNewCityId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-200">Dificultad de Terreno *</label>
              <select
                value={newTerrainDifficulty}
                onChange={(e) => setNewTerrainDifficulty(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="FACIL">🟢 Fácil (Asfalto / Centro)</option>
                <option value="MEDIA">🟡 Media (Ripio / Tierra / Periferia)</option>
                <option value="ALTA">🔴 Alta (Camino rural / Desvío / Barro)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-200">Calles / Negocios de Referencia</label>
            <input
              type="text"
              placeholder="Ej: Av. Mortensen, Calle La Paz, frente a Farmacia..."
              value={newStreets}
              onChange={(e) => setNewStreets(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-emerald-800 dark:text-emerald-400">Tarifa Delivery (Bs.) *</label>
              <input
                type="number"
                step="0.5"
                min="0"
                required
                value={newDeliveryCost}
                onChange={(e) => setNewDeliveryCost(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-amber-800 dark:text-amber-400">Tarifa Carrera (Bs.) *</label>
              <input
                type="number"
                step="0.5"
                min={minRideFare}
                required
                value={newRideCost}
                onChange={(e) => setNewRideCost(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-200">Tiempo Estimado (min)</label>
              <input
                type="number"
                min="5"
                max="240"
                value={newMinutes}
                onChange={(e) => setNewMinutes(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Selector de Coordenadas en Google Maps */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-white">
                <Compass className="w-4 h-4 text-emerald-600" />
                <span>Ubicación en Google Maps</span>
              </div>
              <button
                type="button"
                onClick={handleGetMyLocation}
                disabled={geoLocating}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 transition-colors"
              >
                <LocateFixed className="w-3 h-3" />
                <span>{geoLocating ? "Obteniendo..." : "Capturar mi GPS"}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Latitud</label>
                <input
                  type="number"
                  step="any"
                  value={newLat}
                  onChange={(e) => setNewLat(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="-17.035028"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Longitud</label>
                <input
                  type="number"
                  step="any"
                  value={newLng}
                  onChange={(e) => setNewLng(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="-64.860098"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            {typeof newLat === "number" && typeof newLng === "number" && (
              <div className="space-y-1.5">
                <div className="w-full h-36 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                  <iframe
                    title="Ubicación de la nueva zona"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    src={`https://maps.google.com/maps?q=${newLat},${newLng}&z=14&output=embed`}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span>Pin de zona fijado en {newLat}, {newLng}</span>
                  <a
                    href={`https://www.google.com/maps?q=${newLat},${newLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline inline-flex items-center gap-1"
                  >
                    <span>Abrir en Google Maps</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-200">Descripción o Referencias</label>
            <textarea
              rows={2}
              placeholder="Ej: Abarca desde el puente de acceso hasta la rotonda..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isCreating}
            >
              Guardar Zona y Activar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
