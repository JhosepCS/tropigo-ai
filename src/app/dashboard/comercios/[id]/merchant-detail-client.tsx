"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { OrderStatusBadge } from "@/components/ui/badge";
import {
  Store,
  MapPin,
  Phone,
  Clock,
  TrendingUp,
  Package,
  ArrowLeft,
  Building2,
  Calendar,
  Save,
  Plus,
  Trash2,
  Power,
  CheckCircle2,
  DollarSign,
  Image as ImageIcon,
  FileText,
} from "lucide-react";

const DAYS_OF_WEEK = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export function MerchantDetailClient({
  initialMerchant,
  initialStats,
  categories,
  cities,
}: {
  initialMerchant: any;
  initialStats: any;
  categories: any[];
  cities: any[];
}) {
  const [merchant, setMerchant] = useState(initialMerchant);
  const [stats, setStats] = useState(initialStats);
  const [activeTab, setActiveTab] = useState<
    "info" | "sucursales" | "horarios" | "pedidos" | "metricas"
  >("info");

  // Pestaña 1: Información
  const [name, setName] = useState(merchant.name || "");
  const [legalName, setLegalName] = useState(merchant.legalName || "");
  const [nit, setNit] = useState(merchant.nit || "");
  const [category, setCategory] = useState(merchant.category || "Restaurante");
  const [cityId, setCityId] = useState(merchant.cityId || "");
  const [phone, setPhone] = useState(merchant.phone || "");
  const [address, setAddress] = useState(merchant.address || "");
  const [description, setDescription] = useState(merchant.description || "");
  const [commissionRate, setCommissionRate] = useState(
    Math.round((merchant.commissionRate || 0.1) * 100)
  );
  const [logoUrl, setLogoUrl] = useState(merchant.logoUrl || "");
  const [bannerUrl, setBannerUrl] = useState(merchant.bannerUrl || "");
  const [latitude, setLatitude] = useState(merchant.latitude || "");
  const [longitude, setLongitude] = useState(merchant.longitude || "");
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Pestaña 2: Sucursales
  const [branches, setBranches] = useState<any[]>(merchant.branches || []);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [branchPhone, setBranchPhone] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [isSavingBranch, setIsSavingBranch] = useState(false);

  // Pestaña 3: Horarios
  // Asegurar que existan los 7 días
  const initialSchedulesMap = new Map();
  (merchant.schedules || []).forEach((s: any) =>
    initialSchedulesMap.set(s.dayOfWeek, s)
  );

  const [schedules, setSchedules] = useState<any[]>(
    DAYS_OF_WEEK.map((_, day) => {
      const existing = initialSchedulesMap.get(day);
      return {
        dayOfWeek: day,
        openTime: existing?.openTime || "08:00",
        closeTime: existing?.closeTime || "22:00",
        isClosed: existing ? existing.isClosed : false,
      };
    })
  );
  const [isSavingSchedules, setIsSavingSchedules] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null);

  // Manejo de guardar información general
  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingInfo(true);
    setInfoMessage(null);

    try {
      const res = await fetch(`/api/admin/merchants/${merchant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          legalName,
          nit,
          category,
          cityId,
          phone,
          address,
          description,
          commissionRate: commissionRate / 100,
          logoUrl,
          bannerUrl,
          latitude: latitude ? Number(latitude) : null,
          longitude: longitude ? Number(longitude) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMerchant((prev: any) => ({ ...prev, ...data.merchant }));
      setInfoMessage("Información comercial y ubicación guardadas con éxito.");
    } catch (err: any) {
      alert(err.message || "Error al actualizar información");
    } finally {
      setIsSavingInfo(false);
    }
  };

  // Manejo de alternar estado Abierto / Cerrado
  const handleToggleOpen = async () => {
    const newStatus = !merchant.isOpen;
    setMerchant((prev: any) => ({ ...prev, isOpen: newStatus }));

    try {
      await fetch(`/api/admin/merchants/${merchant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOpen: newStatus }),
      });
    } catch (e) {
      setMerchant((prev: any) => ({ ...prev, isOpen: !newStatus }));
      alert("Error al alternar estado del comercio");
    }
  };

  // Manejo de agregar sucursal
  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBranch(true);

    try {
      const res = await fetch(`/api/admin/merchants/${merchant.id}/branches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: branchName,
          phone: branchPhone,
          address: branchAddress,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setBranches((prev) => [...prev, data.branch]);
      setIsBranchModalOpen(false);
      setBranchName("");
      setBranchPhone("");
      setBranchAddress("");
    } catch (err: any) {
      alert(err.message || "Error al crear sucursal");
    } finally {
      setIsSavingBranch(false);
    }
  };

  // Manejo de eliminar sucursal
  const handleDeleteBranch = async (branchId: string) => {
    if (!confirm("¿Deseas eliminar esta sucursal del comercio?")) return;

    try {
      const res = await fetch(
        `/api/admin/merchants/${merchant.id}/branches/${branchId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setBranches((prev) => prev.filter((b) => b.id !== branchId));
      }
    } catch (e) {
      alert("Error al eliminar sucursal");
    }
  };

  // Manejo de guardar horarios
  const handleSaveSchedules = async () => {
    setIsSavingSchedules(true);
    setScheduleMessage(null);

    try {
      const res = await fetch(`/api/admin/merchants/${merchant.id}/schedules`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedules }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setScheduleMessage("Horarios semanales de atención actualizados con éxito.");
    } catch (err: any) {
      alert(err.message || "Error al guardar horarios");
    } finally {
      setIsSavingSchedules(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header / Banner de Perfil de Comercio */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link
            href="/dashboard/comercios"
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors mt-0.5"
            title="Volver a lista de comercios"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
                {merchant.category}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  merchant.isOpen
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    merchant.isOpen ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                  }`}
                />
                {merchant.isOpen ? "Abierto" : "Cerrado"}
              </span>
              <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                ★ {merchant.rating ? merchant.rating.toFixed(1) : "5.0"}
              </span>
            </div>

            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1.5">
              {merchant.name}
            </h1>

            <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                {merchant.address || "Ivirgarzama Centro"}
              </span>
              {merchant.phone && (
                <span className="flex items-center gap-1 font-semibold text-slate-700">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {merchant.phone}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={merchant.isOpen ? "danger" : "primary"}
            size="sm"
            onClick={handleToggleOpen}
            leftIcon={<Power className="w-3.5 h-3.5" />}
          >
            {merchant.isOpen ? "Pausar / Cerrar" : "Abrir Comercio"}
          </Button>
        </div>
      </div>

      {/* Tabs de Navegación del Perfil */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab("info")}
          className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "info"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Información & Ubicación</span>
        </button>

        <button
          onClick={() => setActiveTab("sucursales")}
          className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "sucursales"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Sucursales ({branches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("horarios")}
          className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "horarios"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Horarios Semanales</span>
        </button>

        <button
          onClick={() => setActiveTab("pedidos")}
          className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "pedidos"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Pedidos Asociados ({merchant.orders?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab("metricas")}
          className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "metricas"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Estadísticas & Rendimiento</span>
        </button>
      </div>

      {/* CONTENIDO SEGÚN TAB */}

      {/* PESTAÑA 1: INFORMACIÓN GENERAL & UBICACIÓN */}
      {activeTab === "info" && (
        <Card>
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-sm font-black text-slate-900">
              Datos Comerciales, Facturación y Ubicación
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6 space-y-4 text-xs">
            {infoMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{infoMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveInfo} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Nombre Comercial</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Categoría Comercial</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Razón Social</label>
                  <input
                    type="text"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">NIT / Facturación</label>
                  <input
                    type="text"
                    value={nit}
                    onChange={(e) => setNit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-semibold text-slate-700">Dirección Oficial en Ivirgarzama</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Comisión TropiGO (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Latitud GPS</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="-17.0298"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Longitud GPS</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="-64.8580"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">URL del Logotipo</label>
                  <input
                    type="text"
                    placeholder="https://... o /logos/comercio.png"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">URL de Portada / Banner</label>
                  <input
                    type="text"
                    placeholder="https://... o /banners/portada.jpg"
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Descripción Comercial</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSavingInfo}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Guardar Información Comercial
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* PESTAÑA 2: SUCURSALES */}
      {activeTab === "sucursales" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900">
              Sucursales y Puntos de Venta
            </h3>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsBranchModalOpen(true)}
            >
              Añadir Sucursal
            </Button>
          </div>

          {branches.length === 0 ? (
            <Card className="p-8 text-center text-xs text-slate-500">
              <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="font-bold text-slate-700">No hay sucursales registradas</p>
              <p>Este comercio opera únicamente desde su dirección principal.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {branches.map((b) => (
                <Card key={b.id}>
                  <CardHeader className="bg-slate-50/70 pb-3 flex flex-row items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Sucursal
                      </span>
                      <CardTitle className="text-sm font-black text-slate-900">
                        {b.name}
                      </CardTitle>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        b.isOpen
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {b.isOpen ? "Activa" : "Inactiva"}
                    </span>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2 text-xs text-slate-600">
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{b.address}</span>
                    </p>
                    {b.phone && (
                      <p className="flex items-center gap-1.5 font-semibold text-slate-700">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{b.phone}</span>
                      </p>
                    )}
                    <div className="pt-2 border-t border-slate-100 flex justify-end">
                      <button
                        onClick={() => handleDeleteBranch(b.id)}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Modal Nueva Sucursal */}
          <Modal
            isOpen={isBranchModalOpen}
            onClose={() => setIsBranchModalOpen(false)}
            title="Registrar Nueva Sucursal"
            description="Añade un punto de venta secundario en el Trópico."
            maxWidth="md"
          >
            <form onSubmit={handleCreateBranch} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Nombre de la Sucursal *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Sucursal Mercado Central"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Teléfono Directo</label>
                <input
                  type="text"
                  placeholder="+591XXXXXXXX"
                  value={branchPhone}
                  onChange={(e) => setBranchPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Dirección de la Sucursal *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Calle Bolívar frente al mercado"
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBranchModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSavingBranch}
                >
                  Guardar Sucursal
                </Button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {/* PESTAÑA 3: HORARIOS SEMANALES */}
      {activeTab === "horarios" && (
        <Card>
          <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Horarios de Apertura y Cierre Semanal</span>
            </CardTitle>

            <Button
              variant="primary"
              size="sm"
              isLoading={isSavingSchedules}
              onClick={handleSaveSchedules}
              leftIcon={<Save className="w-3.5 h-3.5" />}
            >
              Guardar Horarios
            </Button>
          </CardHeader>

          <CardContent className="p-6 space-y-4 text-xs">
            {scheduleMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{scheduleMessage}</span>
              </div>
            )}

            <div className="space-y-2 divide-y divide-slate-100">
              {schedules.map((sch, idx) => (
                <div
                  key={sch.dayOfWeek}
                  className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-700"
                >
                  <div className="w-32 font-bold text-slate-900 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{DAYS_OF_WEEK[sch.dayOfWeek]}</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-slate-400">Apertura:</label>
                      <input
                        type="time"
                        disabled={sch.isClosed}
                        value={sch.openTime}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSchedules((prev) =>
                            prev.map((s, i) =>
                              i === idx ? { ...s, openTime: val } : s
                            )
                          );
                        }}
                        className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono disabled:opacity-40"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-slate-400">Cierre:</label>
                      <input
                        type="time"
                        disabled={sch.isClosed}
                        value={sch.closeTime}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSchedules((prev) =>
                            prev.map((s, i) =>
                              i === idx ? { ...s, closeTime: val } : s
                            )
                          );
                        }}
                        className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono disabled:opacity-40"
                      />
                    </div>

                    <label className="flex items-center gap-1.5 font-bold text-[11px] text-slate-600 cursor-pointer ml-2">
                      <input
                        type="checkbox"
                        checked={sch.isClosed}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSchedules((prev) =>
                            prev.map((s, i) =>
                              i === idx ? { ...s, isClosed: checked } : s
                            )
                          );
                        }}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Cerrado todo el día</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* PESTAÑA 4: PEDIDOS ASOCIADOS */}
      {activeTab === "pedidos" && (
        <Card>
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-sm font-black text-slate-900">
              Historial de Pedidos Registrados para {merchant.name}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0 text-xs">
            {(!merchant.orders || merchant.orders.length === 0) ? (
              <div className="p-8 text-center text-slate-400">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No hay pedidos registrados para este comercio todavía.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Orden</th>
                      <th className="p-3.5">Cliente</th>
                      <th className="p-3.5">Dirección</th>
                      <th className="p-3.5">Repartidor</th>
                      <th className="p-3.5">Total (Bs.)</th>
                      <th className="p-3.5 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {merchant.orders.map((order: any) => (
                      <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-slate-900">
                          {order.orderNumber}
                        </td>
                        <td className="p-3.5 font-medium text-slate-800">
                          {order.customer?.name || order.customer?.phone || "Cliente"}
                        </td>
                        <td className="p-3.5 text-slate-500 max-w-xs truncate">
                          {order.deliveryAddressText}
                        </td>
                        <td className="p-3.5 text-slate-600">
                          {order.assignedRider?.name || "Sin asignar"}
                        </td>
                        <td className="p-3.5 font-black text-slate-900">
                          {order.totalAmount.toFixed(2)} Bs.
                        </td>
                        <td className="p-3.5 text-right">
                          <OrderStatusBadge status={order.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* PESTAÑA 5: ESTADÍSTICAS & RENDIMIENTO */}
      {activeTab === "metricas" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                Ventas Brutas Totales
              </span>
              <p className="text-2xl font-black text-emerald-950 mt-1">
                {stats.totalRevenueBs.toFixed(2)} <span className="text-xs font-bold">Bs.</span>
              </p>
              <p className="text-[10px] text-emerald-700 mt-0.5">
                Calculado de pedidos entregados
              </p>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
              <span className="text-[10px] font-bold text-teal-800 uppercase block">
                Comisión Generada TropiGO
              </span>
              <p className="text-2xl font-black text-teal-950 mt-1">
                {stats.commissionGeneratedBs.toFixed(2)} <span className="text-xs font-bold">Bs.</span>
              </p>
              <p className="text-[10px] text-teal-700 mt-0.5">
                {(merchant.commissionRate * 100).toFixed(0)}% pactado
              </p>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
              <span className="text-[10px] font-bold text-amber-800 uppercase block">
                Ticket Promedio
              </span>
              <p className="text-2xl font-black text-amber-950 mt-1">
                {stats.averageTicketBs.toFixed(2)} <span className="text-xs font-bold">Bs.</span>
              </p>
              <p className="text-[10px] text-amber-700 mt-0.5">
                Por pedido entregado
              </p>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">
                Volumen de Pedidos
              </span>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {stats.completedOrdersCount} / {stats.totalOrders}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Completados / Registrados
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
