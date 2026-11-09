"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  Store,
  MapPin,
  Phone,
  Clock,
  TrendingUp,
  Save,
  Plus,
  Trash2,
  Power,
  CheckCircle2,
  ArrowLeft,
  Calendar,
  Building2,
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

export function MerchantProfileClient({
  initialMerchant,
  initialStats,
}: {
  initialMerchant: any;
  initialStats: any;
}) {
  const [merchant, setMerchant] = useState(initialMerchant);
  const [stats, setStats] = useState(initialStats);
  const [activeTab, setActiveTab] = useState<"info" | "horarios" | "sucursales">("info");

  // Formulario Información
  const [phone, setPhone] = useState(merchant.phone || "");
  const [address, setAddress] = useState(merchant.address || "");
  const [description, setDescription] = useState(merchant.description || "");
  const [logoUrl, setLogoUrl] = useState(merchant.logoUrl || "");
  const [bannerUrl, setBannerUrl] = useState(merchant.bannerUrl || "");
  const [latitude, setLatitude] = useState(merchant.latitude || "");
  const [longitude, setLongitude] = useState(merchant.longitude || "");
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Formulario Sucursales
  const [branches, setBranches] = useState<any[]>(merchant.branches || []);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [branchPhone, setBranchPhone] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [isSavingBranch, setIsSavingBranch] = useState(false);

  // Formulario Horarios
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

  // Guardar Información
  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingInfo(true);
    setInfoMessage(null);

    try {
      const res = await fetch("/api/comercio/my-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          address,
          description,
          logoUrl,
          bannerUrl,
          latitude: latitude ? Number(latitude) : null,
          longitude: longitude ? Number(longitude) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMerchant((prev: any) => ({ ...prev, ...data.merchant }));
      setInfoMessage("Información de tu negocio actualizada exitosamente.");
    } catch (err: any) {
      alert(err.message || "Error al actualizar información");
    } finally {
      setIsSavingInfo(false);
    }
  };

  // Alternar Abierto / Cerrado
  const handleToggleOpen = async () => {
    const newStatus = !merchant.isOpen;
    setMerchant((prev: any) => ({ ...prev, isOpen: newStatus }));

    try {
      await fetch("/api/comercio/my-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOpen: newStatus }),
      });
    } catch (e) {
      setMerchant((prev: any) => ({ ...prev, isOpen: !newStatus }));
      alert("Error al alternar estado de cocina");
    }
  };

  // Guardar Horarios
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

      setScheduleMessage("Tus horarios de atención han sido guardados con éxito.");
    } catch (err: any) {
      alert(err.message || "Error al guardar horarios");
    } finally {
      setIsSavingSchedules(false);
    }
  };

  // Crear Sucursal
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

  // Eliminar Sucursal
  const handleDeleteBranch = async (branchId: string) => {
    if (!confirm("¿Deseas eliminar esta sucursal?")) return;

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

  return (
    <div className="space-y-6">
      {/* Banner Principal de Negocio */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {merchant.category}
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                merchant.isOpen
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  merchant.isOpen ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                }`}
              />
              {merchant.isOpen ? "Cocina Abierta" : "Cocina Cerrada"}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1.5">
            {merchant.name}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
            <span>{merchant.city?.name || "Ivirgarzama"}</span>
            <span>•</span>
            <span>★ {merchant.rating ? merchant.rating.toFixed(1) : "5.0"} de calificación</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={merchant.isOpen ? "danger" : "primary"}
            size="sm"
            onClick={handleToggleOpen}
            leftIcon={<Power className="w-3.5 h-3.5" />}
          >
            {merchant.isOpen ? "Pausar Cocina Ahora" : "Abrir Cocina"}
          </Button>
        </div>
      </div>

      {/* Métricas Resumidas del Comercio */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">
            Ventas Totales
          </span>
          <p className="text-lg font-black text-emerald-700 mt-0.5">
            {stats.totalRevenueBs.toFixed(2)} Bs.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">
            Pedidos Completados
          </span>
          <p className="text-lg font-black text-slate-900 mt-0.5">
            {stats.completedOrders}
          </p>
        </div>

        <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">
            Comisión de Plataforma
          </span>
          <p className="text-lg font-black text-slate-900 mt-0.5">
            {(merchant.commissionRate * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("info")}
          className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === "info"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Información & Contacto</span>
        </button>

        <button
          onClick={() => setActiveTab("horarios")}
          className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === "horarios"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Mis Horarios</span>
        </button>

        <button
          onClick={() => setActiveTab("sucursales")}
          className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === "sucursales"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Sucursales ({branches.length})</span>
        </button>
      </div>

      {/* TAB 1: INFORMACIÓN */}
      {activeTab === "info" && (
        <Card>
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-sm font-black text-slate-900">
              Datos de tu Negocio en TropiGO
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
                  <label className="font-semibold text-slate-700">Teléfono / WhatsApp de Pedidos</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Dirección Principal en Ivirgarzama</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">URL de Portada / Banner</label>
                  <input
                    type="text"
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Descripción o Especialidad</label>
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
                  Guardar Cambios
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* TAB 2: HORARIOS */}
      {activeTab === "horarios" && (
        <Card>
          <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Horarios de Atención de Cocina</span>
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
                      <span>Cerrado</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: SUCURSALES */}
      {activeTab === "sucursales" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900">
              Mis Sucursales Registradas
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
              <p className="font-bold text-slate-700">Sin sucursales adicionales</p>
              <p>Tu comercio opera únicamente en su dirección central.</p>
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

          {/* Modal Sucursal */}
          <Modal
            isOpen={isBranchModalOpen}
            onClose={() => setIsBranchModalOpen(false)}
            title="Registrar Sucursal de tu Negocio"
            description="Ingresa la dirección y contacto de tu nuevo punto de venta."
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
                <label className="font-semibold text-slate-700">Teléfono</label>
                <input
                  type="text"
                  placeholder="+591XXXXXXXX"
                  value={branchPhone}
                  onChange={(e) => setBranchPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Dirección *</label>
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
    </div>
  );
}
