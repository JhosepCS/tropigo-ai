"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { ImageUploader } from "@/components/ui/image-uploader";
import {
  Store,
  Search,
  Plus,
  MapPin,
  Phone,
  Power,
  ChevronRight,
  Filter,
  DollarSign,
  ArrowRight,
  Building2,
  CheckCircle2,
  Image as ImageIcon,
  Compass,
  ExternalLink,
  LocateFixed,
} from "lucide-react";

export function ComerciosClient({
  initialMerchants,
  categories,
  cities,
  initialPagination,
}: {
  initialMerchants: any[];
  categories: any[];
  cities: any[];
  initialPagination: { page: number; totalPages: number; total: number };
}) {
  const [merchants, setMerchants] = useState<any[]>(initialMerchants);
  const [pagination, setPagination] = useState(initialPagination);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("TODOS");
  const [selectedCity, setSelectedCity] = useState("TODOS");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Formulario de registro de comercio
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [nit, setNit] = useState("");
  const [category, setCategory] = useState(categories[0]?.name || "Restaurante");
  const [cityId, setCityId] = useState(cities[0]?.id || "");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [commissionRate, setCommissionRate] = useState(10); // 10%
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [latitude, setLatitude] = useState<number | "">(-17.033507);
  const [longitude, setLongitude] = useState<number | "">(-64.857436);
  const [geoLocating, setGeoLocating] = useState(false);

  // Cargar comercios con filtros del servidor
  const fetchMerchants = async (page = 1) => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedCategory !== "TODOS") params.set("category", selectedCategory);
      if (selectedCity !== "TODOS") params.set("cityId", selectedCity);
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("limit", "12");

      const res = await fetch(`/api/admin/merchants?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMerchants(data.merchants);
        setPagination(data.pagination);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMerchants(1);
  };

  const handleToggleOpen = async (merchantId: string, currentOpen: boolean) => {
    setTogglingId(merchantId);
    const newStatus = !currentOpen;

    // Optimistic UI
    setMerchants((prev) =>
      prev.map((m) => (m.id === merchantId ? { ...m, isOpen: newStatus } : m))
    );

    try {
      const res = await fetch(`/api/admin/merchants/${merchantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOpen: newStatus }),
      });

      if (!res.ok) {
        setMerchants((prev) =>
          prev.map((m) => (m.id === merchantId ? { ...m, isOpen: currentOpen } : m))
        );
        alert("Error al cambiar estado del comercio.");
      }
    } catch (e) {
      setMerchants((prev) =>
        prev.map((m) => (m.id === merchantId ? { ...m, isOpen: currentOpen } : m))
      );
    } finally {
      setTogglingId(null);
    }
  };

  // Obtener ubicación GPS actual del dispositivo
  const handleGetMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Tu navegador no soporta geolocalización.");
      return;
    }
    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(Number(pos.coords.latitude.toFixed(6)));
        setLongitude(Number(pos.coords.longitude.toFixed(6)));
        setGeoLocating(false);
      },
      (err) => {
        alert("No se pudo obtener la ubicación GPS: " + err.message);
        setGeoLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleCreateMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/merchants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          legalName,
          nit,
          category,
          cityId,
          phone,
          address,
          commissionRate: commissionRate / 100,
          description,
          imageUrl: imageUrl.trim() || null,
          logoUrl: imageUrl.trim() || null,
          latitude: typeof latitude === "number" ? latitude : null,
          longitude: typeof longitude === "number" ? longitude : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear comercio");

      setIsModalOpen(false);
      setName("");
      setLegalName("");
      setNit("");
      setPhone("");
      setAddress("");
      setDescription("");
      setImageUrl("");
      setLatitude(-17.033507);
      setLongitude(-64.857436);
      fetchMerchants(1);
    } catch (err: any) {
      alert(err.message || "Error al registrar comercio");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado con Botón de Creación */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 tracking-wider uppercase bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            Módulo de Comercios Afiliados
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1.5">
            Comercios del Trópico de Cochabamba
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {pagination.total} negocios registrados • Sucursales, fotos, ubicación en Google Maps y tarifas
          </p>
        </div>

        <div>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsModalOpen(true)}
            className="shadow-sm"
          >
            Registrar Comercio
          </Button>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Buscar por nombre, NIT, teléfono o dirección..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="TODOS">Todas las Categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="TODOS">Todas las Localidades</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Todos los Estados</option>
              <option value="open">Abiertos Ahora</option>
              <option value="closed">Cerrados / Fuera de Turno</option>
            </select>

            <Button type="submit" variant="secondary" size="sm">
              Filtrar
            </Button>
          </div>
        </form>
      </div>

      {/* Grid de Comercios */}
      {merchants.length === 0 ? (
        <EmptyState
          icon={<Store className="w-8 h-8 text-slate-400" />}
          title="No se encontraron comercios"
          description="Intenta cambiar los términos de búsqueda o registra un nuevo comercio afiliado."
          actionLabel="Registrar Nuevo Comercio"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {merchants.map((m) => {
            const isToggling = togglingId === m.id;
            const hasCoords = m.latitude != null && m.longitude != null;
            const mapsUrl = hasCoords
              ? `https://www.google.com/maps?q=${m.latitude},${m.longitude}`
              : null;

            return (
              <Card
                key={m.id}
                className="hover:border-emerald-300 dark:hover:border-emerald-700 transition-all flex flex-col justify-between group"
              >
                {/* Banner / Foto del Comercio si existe */}
                {m.imageUrl ? (
                  <div className="relative h-32 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                      src={m.imageUrl}
                      alt={m.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1 backdrop-blur-md ${
                          m.isOpen
                            ? "bg-emerald-500/90 text-white"
                            : "bg-slate-900/80 text-slate-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            m.isOpen ? "bg-white animate-pulse" : "bg-slate-400"
                          }`}
                        />
                        {m.isOpen ? "Abierto" : "Cerrado"}
                      </span>
                    </div>
                  </div>
                ) : null}

                <CardHeader className="bg-slate-50/70 dark:bg-slate-800/40 pb-3 flex flex-row items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 block tracking-wider truncate">
                      {m.category || m.commercialCategory?.name || "Comercio"}
                    </span>
                    <CardTitle className="text-base font-black text-slate-900 dark:text-white truncate">
                      {m.name}
                    </CardTitle>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span>{m.city?.name || "Ivirgarzama"}</span>
                    </p>
                  </div>

                  {!m.imageUrl && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${
                        m.isOpen
                          ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          m.isOpen ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                        }`}
                      />
                      {m.isOpen ? "Abierto" : "Cerrado"}
                    </span>
                  )}
                </CardHeader>

                <CardContent className="p-4 space-y-3 text-xs text-slate-600 dark:text-slate-300 flex-1">
                  <p className="line-clamp-2 text-slate-500 dark:text-slate-400 text-[11px]">
                    {m.description || "Sin descripción proporcionada"}
                  </p>

                  <div className="space-y-1.5 text-[11px] border-t border-slate-100 dark:border-slate-800 pt-2">
                    <p className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{m.address || "Dirección no especificada"}</span>
                    </p>
                    {m.phone && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{m.phone}</span>
                      </p>
                    )}
                    {mapsUrl && (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline pt-0.5"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Ver ubicación en Google Maps</span>
                      </a>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center text-[10px]">
                    <div className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                      <span className="text-slate-400 dark:text-slate-500 block font-medium">Platos</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {m._count?.products || 0}
                      </span>
                    </div>
                    <div className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                      <span className="text-slate-400 dark:text-slate-500 block font-medium">Pedidos</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {m._count?.orders || 0}
                      </span>
                    </div>
                    <div className="p-1.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40">
                      <span className="text-emerald-700 dark:text-emerald-400 block font-medium">Comisión</span>
                      <span className="text-xs font-black text-emerald-900 dark:text-emerald-300">
                        {(Number(m.commissionRate || 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </CardContent>

                <div className="p-3 bg-slate-50/50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleToggleOpen(m.id, m.isOpen)}
                    disabled={isToggling}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                      m.isOpen
                        ? "bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 hover:bg-red-100 border border-red-200 dark:border-red-900"
                        : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800"
                    }`}
                  >
                    <Power className="w-3 h-3" />
                    <span>{m.isOpen ? "Cerrar" : "Abrir"}</span>
                  </button>

                  <Link
                    href={`/dashboard/comercios/${m.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 px-3 py-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                  >
                    <span>Ver Perfil</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Paginación */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400">
          <span>
            Página {pagination.page} de {pagination.totalPages} ({pagination.total} comercios)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => fetchMerchants(pagination.page - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchMerchants(pagination.page + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Modal para Registrar Comercio */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Nuevo Comercio en TropiGO"
        description="Ingresa los datos comerciales, foto o logo y coordenadas en Google Maps para Ivirgarzama."
        maxWidth="xl"
      >
        <form onSubmit={handleCreateMerchant} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-200">Nombre Comercial *</label>
              <input
                type="text"
                required
                placeholder="Ej: Pollería El Pahuichi"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-200">Categoría Comercial *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subida de Foto o Logo */}
          <ImageUploader
            value={imageUrl}
            onChange={setImageUrl}
            label="Foto o Logo del Negocio"
            helperText="Sube una foto o logo desde tu dispositivo (JPG/PNG) o pega un enlace. La IA la enviará a los clientes en WhatsApp."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-200">Razón Social</label>
              <input
                type="text"
                placeholder="Ej: Inversiones Pahuichi S.R.L."
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-200">NIT / Facturación</label>
              <input
                type="text"
                placeholder="Ej: 102349021"
                value={nit}
                onChange={(e) => setNit(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-200">Localidad *</label>
              <select
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
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
              <label className="font-semibold text-slate-700 dark:text-slate-200">Teléfono / WhatsApp *</label>
              <input
                type="text"
                required
                placeholder="+591XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-200">Comisión (%)</label>
              <input
                type="number"
                min="0"
                max="50"
                value={commissionRate}
                onChange={(e) => setCommissionRate(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-200">Dirección Principal *</label>
            <input
              type="text"
              required
              placeholder="Ej: Av. Mortensen esq. Cochabamba #240"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Selector de Coordenadas y Google Maps */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-white">
                <Compass className="w-4 h-4 text-emerald-600" />
                <span>Ubicación GPS (Ivirgarzama)</span>
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
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="-17.033507"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Longitud</label>
                <input
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="-64.857436"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            {/* Vista previa embebida del mapa */}
            {typeof latitude === "number" && typeof longitude === "number" && (
              <div className="space-y-1.5">
                <div className="w-full h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                  <iframe
                    title="Ubicación del comercio"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    src={`https://maps.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span>Pin centrado en {latitude}, {longitude}</span>
                  <a
                    href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline inline-flex items-center gap-1"
                  >
                    <span>Abrir en Google Maps grande</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-200">Descripción o Especialidad</label>
            <textarea
              rows={2}
              placeholder="Breve reseña del comercio para los clientes de la aplicación..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              isLoading={isSubmitting}
            >
              Crear y Configurar Horarios
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
