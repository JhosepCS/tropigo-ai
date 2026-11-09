"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
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
        // Revertir
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
        <div>
          <span className="text-[11px] font-bold text-emerald-700 tracking-wider uppercase bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Módulo de Comercios Afiliados
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1.5">
            Comercios del Trópico de Cochabamba
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {pagination.total} negocios registrados • Sucursales, horarios, tarifas y comisiones oficiales
          </p>
        </div>

        <div>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsModalOpen(true)}
          >
            Registrar Comercio
          </Button>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
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
              onChange={(e) => {
                setSelectedCategory(e.target.value);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              onChange={(e) => {
                setSelectedCity(e.target.value);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              onChange={(e: any) => {
                setStatusFilter(e.target.value);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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

            return (
              <Card
                key={m.id}
                className="hover:border-emerald-300 transition-all flex flex-col justify-between"
              >
                <CardHeader className="bg-slate-50/70 pb-3 flex flex-row items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider truncate">
                      {m.category || m.commercialCategory?.name || "Comercio"}
                    </span>
                    <CardTitle className="text-base font-black text-slate-900 truncate">
                      {m.name}
                    </CardTitle>
                    <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span>{m.city?.name || "Ivirgarzama"}</span>
                    </p>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${
                      m.isOpen
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        m.isOpen ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                      }`}
                    />
                    {m.isOpen ? "Abierto" : "Cerrado"}
                  </span>
                </CardHeader>

                <CardContent className="p-4 space-y-3 text-xs text-slate-600 flex-1">
                  <p className="line-clamp-2 text-slate-500 text-[11px]">
                    {m.description || "Sin descripción proporcionada"}
                  </p>

                  <div className="space-y-1.5 text-[11px] border-t border-slate-100 pt-2">
                    <p className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{m.address || "Dirección no especificada"}</span>
                    </p>
                    {m.phone && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-800">{m.phone}</span>
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center text-[10px]">
                    <div className="p-1.5 rounded-xl bg-slate-50">
                      <span className="text-slate-400 block font-medium">Platos</span>
                      <span className="text-xs font-bold text-slate-900">
                        {m._count?.products || 0}
                      </span>
                    </div>
                    <div className="p-1.5 rounded-xl bg-slate-50">
                      <span className="text-slate-400 block font-medium">Pedidos</span>
                      <span className="text-xs font-bold text-slate-900">
                        {m._count?.orders || 0}
                      </span>
                    </div>
                    <div className="p-1.5 rounded-xl bg-emerald-50/60">
                      <span className="text-emerald-700 block font-medium">Comisión</span>
                      <span className="text-xs font-black text-emerald-900">
                        {(m.commissionRate * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </CardContent>

                <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleToggleOpen(m.id, m.isOpen)}
                    disabled={isToggling}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                      m.isOpen
                        ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                        : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                    }`}
                  >
                    <Power className="w-3 h-3" />
                    <span>{m.isOpen ? "Cerrar" : "Abrir"}</span>
                  </button>

                  <Link
                    href={`/dashboard/comercios/${m.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-emerald-700 px-3 py-1.5 rounded-xl hover:bg-white transition-colors border border-transparent hover:border-slate-200"
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
        <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200/80 text-xs font-semibold text-slate-600">
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
        description="Ingresa los datos comerciales, localidad del Trópico y porcentaje de comisión acordado."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateMerchant} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Nombre Comercial *</label>
              <input
                type="text"
                required
                placeholder="Ej: Pollería El Pahuichi"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Categoría Comercial *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Razón Social</label>
              <input
                type="text"
                placeholder="Ej: Inversiones Pahuichi S.R.L."
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">NIT / Facturación</label>
              <input
                type="text"
                placeholder="Ej: 102349021"
                value={nit}
                onChange={(e) => setNit(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Localidad (Trópico) *</label>
              <select
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Teléfono / WhatsApp *</label>
              <input
                type="text"
                required
                placeholder="+591XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Comisión (%)</label>
              <input
                type="number"
                min="0"
                max="50"
                value={commissionRate}
                onChange={(e) => setCommissionRate(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Dirección Principal *</label>
            <input
              type="text"
              required
              placeholder="Ej: Av. Mortensen esq. Cochabamba #240"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Descripción o Especialidad</label>
            <textarea
              rows={2}
              placeholder="Breve reseña del comercio para los clientes de la aplicación..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
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
