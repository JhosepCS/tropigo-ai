"use client";

import React, { useState, useMemo } from "react";
import {
  Wallet,
  DollarSign,
  TrendingUp,
  Package,
  Bike,
  Calendar,
  Search,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Send,
  Copy,
  Check,
  AlertCircle,
  FileText,
  ExternalLink,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { FleetAuditSummary, RiderAuditDetail } from "@/lib/settlements/service";

interface SettlementRecord {
  id: string;
  riderId: string;
  rider: {
    id: string;
    name: string;
    phone: string;
    vehicleType: string;
    plateNumber: string;
  };
  periodStart: string;
  periodEnd: string;
  totalOrdersCount: number;
  totalRidesCount: number;
  grossEarned: number;
  platformCommission: number;
  netPayout: number;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

interface RiderOption {
  id: string;
  name: string;
  phone: string;
  vehicleType: string;
  plateNumber: string;
}

interface LiquidacionesClientProps {
  initialFleetAudit: FleetAuditSummary;
  initialSettlements: SettlementRecord[];
  riders: RiderOption[];
}

export function LiquidacionesClient({
  initialFleetAudit,
  initialSettlements,
  riders,
}: LiquidacionesClientProps) {
  // Estado principal
  const [activeTab, setActiveTab] = useState<"live" | "history">("live");
  const [fleetAudit, setFleetAudit] = useState<FleetAuditSummary>(initialFleetAudit);
  const [settlements, setSettlements] = useState<SettlementRecord[]>(initialSettlements);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Periodo seleccionado
  const [periodPreset, setPeriodPreset] = useState<"today" | "yesterday" | "week">("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Modal de detalle y liquidación
  const [selectedAudit, setSelectedAudit] = useState<RiderAuditDetail | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  // Recarga de auditoría en vivo
  const fetchLiveAudit = async (preset = periodPreset) => {
    setLoading(true);
    setFeedback(null);
    try {
      let startStr = "";
      let endStr = "";
      const now = new Date();

      if (preset === "today") {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        startStr = start.toISOString();
        endStr = end.toISOString();
      } else if (preset === "yesterday") {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        const start = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
        const end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
        startStr = start.toISOString();
        endStr = end.toISOString();
      } else if (preset === "week") {
        const w = new Date(now);
        w.setDate(w.getDate() - 7);
        const start = new Date(w.getFullYear(), w.getMonth(), w.getDate(), 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        startStr = start.toISOString();
        endStr = end.toISOString();
      }

      const res = await fetch(
        `/api/admin/settlements?mode=live&startDate=${encodeURIComponent(
          startStr
        )}&endDate=${encodeURIComponent(endStr)}`
      );
      if (!res.ok) throw new Error("Error al consultar auditoría");
      const data: FleetAuditSummary = await res.json();
      setFleetAudit(data);
    } catch (err: any) {
      setFeedback({ type: "err", msg: err.message || "Error al actualizar datos" });
    } finally {
      setLoading(false);
    }
  };

  // Recarga de historial de liquidaciones
  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/settlements?mode=history`);
      if (!res.ok) throw new Error("Error al consultar historial");
      const data = await res.json();
      setSettlements(data.settlements || []);
    } catch (err: any) {
      setFeedback({ type: "err", msg: err.message || "Error al cargar historial" });
    } finally {
      setLoading(false);
    }
  };

  // Guardar liquidación oficial
  const handleCreateSettlement = async (audit: RiderAuditDetail, markAsPaid = false) => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          riderId: audit.rider.id,
          periodStart: audit.periodStart,
          periodEnd: audit.periodEnd,
          markAsPaid,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "No se pudo registrar la liquidación.");
      }

      const data = await res.json();
      setFeedback({
        type: "ok",
        msg: `Liquidación guardada exitosamente para ${audit.rider.name}.`,
      });
      // Actualizar historial
      fetchHistory();
      setIsDetailModalOpen(false);
    } catch (err: any) {
      setFeedback({ type: "err", msg: err.message || "Error al procesar" });
    } finally {
      setActionLoading(false);
    }
  };

  // Marcar liquidación histórica como PAGADO
  const handleTogglePaid = async (settlementId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "PAGADO" ? "PENDIENTE" : "PAGADO";
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/settlements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: settlementId, status: nextStatus }),
      });
      if (!res.ok) throw new Error("No se pudo actualizar el estado.");

      setSettlements((prev) =>
        prev.map((s) =>
          s.id === settlementId
            ? {
                ...s,
                status: nextStatus,
                paidAt: nextStatus === "PAGADO" ? new Date().toISOString() : null,
              }
            : s
        )
      );
    } catch (err: any) {
      alert(err.message || "Error al actualizar");
    } finally {
      setActionLoading(false);
    }
  };

  // Copiar resumen de WhatsApp
  const handleCopyWhatsApp = (text: string) => {
    try {
      navigator.clipboard.writeText(decodeURIComponent(text));
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    } catch {
      // Fallback
    }
  };

  // Filtrado de auditorías
  const filteredAudits = useMemo(() => {
    return fleetAudit.ridersAudits.filter(
      (a) =>
        a.rider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.rider.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.rider.phone.includes(searchQuery)
    );
  }, [fleetAudit, searchQuery]);

  // Filtrado de historial
  const filteredHistory = useMemo(() => {
    return settlements.filter(
      (s) =>
        s.rider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.rider.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.status.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [settlements, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header con identidad visual de TropiGO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Cierre de Caja & Liquidaciones
            </h1>
            <span className="text-xs bg-[#5C3470]/10 text-[#5C3470] border border-[#5C3470]/20 font-black px-2.5 py-0.5 rounded-full">
              Ivirgarzama
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Auditoría de recaudación de motorizados, cruce de efectivo vs QR y rendición con restaurantes.
          </p>
        </div>

        {/* Selector de periodo rápido */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200">
          <button
            onClick={() => {
              setPeriodPreset("today");
              fetchLiveAudit("today");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodPreset === "today"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Hoy
          </button>
          <button
            onClick={() => {
              setPeriodPreset("yesterday");
              fetchLiveAudit("yesterday");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodPreset === "yesterday"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Ayer
          </button>
          <button
            onClick={() => {
              setPeriodPreset("week");
              fetchLiveAudit("week");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodPreset === "week"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Últimos 7 días
          </button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => (activeTab === "live" ? fetchLiveAudit() : fetchHistory())}
            disabled={loading}
            className="h-8 px-2 text-slate-600 hover:text-slate-900"
            title="Recargar datos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Alerta de Feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between ${
            feedback.type === "ok"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-rose-50 text-rose-900 border border-rose-200"
          }`}
        >
          <span>{feedback.msg}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tarjetas KPI de Resumen General */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Total Servicios */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Servicios Totales</span>
            <Package className="w-4 h-4 text-[#8E58A6]" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            {fleetAudit.totalServicesCount}
          </p>
          <p className="text-[11px] text-slate-500">
            {fleetAudit.totalOrdersCount} pedidos • {fleetAudit.totalRidesCount} viajes
          </p>
        </div>

        {/* KPI 2: Ganancia Bruta Flota */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Ganado por Flota</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600">
            {Number(fleetAudit.totalGrossEarnedByRiders || 0).toFixed(2)}{" "}
            <span className="text-xs font-bold">Bs.</span>
          </p>
          <p className="text-[11px] text-slate-500">Tarifas de delivery y mototaxi</p>
        </div>

        {/* KPI 3: Efectivo Físico en Mano */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Efectivo en Bolsillo</span>
            <Wallet className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700">
            {Number(fleetAudit.totalCashCollectedInHand || 0).toFixed(2)}{" "}
            <span className="text-xs font-bold">Bs.</span>
          </p>
          <p className="text-[11px] text-slate-500">Cobrado al cliente en mano</p>
        </div>

        {/* KPI 4: Rendición a Central */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Comida a Rendir</span>
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-700">
            {Number(fleetAudit.totalRestaurantSubtotals || 0).toFixed(2)}{" "}
            <span className="text-xs font-bold">Bs.</span>
          </p>
          <p className="text-[11px] text-slate-500">Subtotal que pertenece a cocina</p>
        </div>
      </div>

      {/* Selector de Pestañas y Barra de Búsqueda */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("live")}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === "live"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Cierre en Vivo ({fleetAudit.periodLabel})</span>
            <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">
              {fleetAudit.ridersAudits.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("history");
              if (settlements.length === 0) fetchHistory();
            }}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === "history"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Historial de Liquidaciones</span>
            <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">
              {settlements.length}
            </span>
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por conductor, placa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs rounded-2xl bg-white border-slate-200"
          />
        </div>
      </div>

      {/* CONTENIDO PESTAÑA 1: AUDITORÍA EN VIVO */}
      {activeTab === "live" && (
        <div className="space-y-4">
          {filteredAudits.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white border border-slate-200">
              <Bike className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">
                No hay conductores activos registrados
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Los conductores registrados aparecerán aquí para auditar sus cobros de carreras y pedidos.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredAudits.map((item) => {
                const isOwed = item.direction === "RIDER_OWES_CENTRAL";
                const isPayable = item.direction === "CENTRAL_OWES_RIDER";

                return (
                  <div
                    key={item.rider.id}
                    className="p-5 rounded-3xl bg-white border border-slate-200 hover:border-slate-300 shadow-sm transition-all space-y-4 flex flex-col justify-between"
                  >
                    {/* Header Conductor */}
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-700 text-sm">
                            {item.rider.vehicleType === "TORITO_TRIMOVIL" ? "🛺" : "🏍️"}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm leading-tight">
                              {item.rider.name}
                            </h3>
                            <p className="text-[11px] text-slate-500">
                              {item.rider.vehicleType} • Placa: {item.rider.plateNumber}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            item.totalServicesCount > 0
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {item.totalServicesCount} serv.
                        </span>
                      </div>

                      {/* Cuadrícula de Números */}
                      <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                        <div className="p-2.5 rounded-2xl bg-slate-50 space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-semibold block">
                            Ganancia Neta
                          </span>
                          <span className="font-black text-emerald-700 text-sm">
                            {item.netEarned.toFixed(2)} Bs.
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {item.totalOrdersCount} ent. • {item.totalRidesCount} viajes
                          </span>
                        </div>

                        <div className="p-2.5 rounded-2xl bg-slate-50 space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-semibold block">
                            Efectivo en Mano
                          </span>
                          <span className="font-black text-amber-700 text-sm">
                            {item.totalCashCollectedInHand.toFixed(2)} Bs.
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Cobranza física
                          </span>
                        </div>
                      </div>

                      {/* Desglose de comida vs QR */}
                      <div className="mt-3 space-y-1.5 text-[11px] text-slate-600">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Comida adeudada a cocina:</span>
                          <span className="font-bold text-slate-800">
                            {item.cashRestaurantSubtotalOwed.toFixed(2)} Bs.
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Servicios cobrados por QR:</span>
                          <span className="font-bold text-slate-800">
                            {item.totalDigitalOwedToRider.toFixed(2)} Bs.
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Badge de Balance de Cierre */}
                    <div>
                      <div
                        className={`p-3 rounded-2xl text-xs font-black flex items-center justify-between ${
                          isOwed
                            ? "bg-rose-50 text-rose-900 border border-rose-200"
                            : isPayable
                            ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {isOwed ? (
                            <ArrowUpRight className="w-4 h-4 text-rose-600 shrink-0" />
                          ) : isPayable ? (
                            <ArrowDownLeft className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-slate-500 shrink-0" />
                          )}
                          <span className="text-[11px] uppercase tracking-tight">
                            {isOwed
                              ? "Rider rinde a Central"
                              : isPayable
                              ? "Central paga al Rider"
                              : "Cuentas Saldadas"}
                          </span>
                        </div>
                        <span className="text-sm">
                          {item.balanceDifference.toFixed(2)} Bs.
                        </span>
                      </div>

                      {/* Botones de Acción */}
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedAudit(item);
                            setIsDetailModalOpen(true);
                          }}
                          className="text-xs h-8 rounded-xl font-bold border-slate-200"
                        >
                          Ver Detalle
                        </Button>

                        <a
                          href={`https://wa.me/591${item.rider.phone.replace(
                            /\D/g,
                            ""
                          )}?text=${encodeURIComponent(
                            `🛵 *CIERRE DE CAJA — TROPIGO AI*\n📅 *Periodo:* ${
                              item.periodLabel
                            }\n👤 *Conductor:* ${item.rider.name}\n\n*Servicios:* ${
                              item.totalServicesCount
                            } (${item.totalOrdersCount} entregas, ${
                              item.totalRidesCount
                            } carreras)\n*Tu Ganancia:* ${item.netEarned.toFixed(
                              2
                            )} Bs.\n*Efectivo en mano:* ${item.totalCashCollectedInHand.toFixed(
                              2
                            )} Bs.\n*Comida restaurantes:* ${item.cashRestaurantSubtotalOwed.toFixed(
                              2
                            )} Bs.\n\n👉 *Balance final:* ${
                              item.directionLabel
                            }\n\n_TropiGO AI • Ivirgarzama_`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 text-xs h-8 rounded-xl font-bold bg-[#25D366] hover:bg-[#20ba59] text-white shadow-sm transition-all"
                        >
                          <Send className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO PESTAÑA 2: HISTORIAL DE LIQUIDACIONES */}
      {activeTab === "history" && (
        <Card className="rounded-3xl border-slate-200 overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#8E58A6]" />
              <span>Cierres de Caja Registrados</span>
            </CardTitle>
            <span className="text-xs text-slate-400">{filteredHistory.length} registros</span>
          </CardHeader>

          <CardContent className="p-0">
            {filteredHistory.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-800">
                  No hay cierres de caja registrados en el historial
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Cuando guardes un cierre desde la pestaña "Cierre en Vivo", quedará archivado aquí.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredHistory.map((s) => {
                  const isPaid = s.status === "PAGADO";
                  return (
                    <div
                      key={s.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {s.rider.name}
                          </span>
                          <span className="text-[10px] text-slate-500 px-2 py-0.5 rounded-full bg-slate-100 font-semibold">
                            {s.rider.vehicleType} • {s.rider.plateNumber}
                          </span>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              isPaid
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-amber-50 text-amber-800 border border-amber-200"
                            }`}
                          >
                            {isPaid ? "PAGADO / SALDADO" : "PENDIENTE"}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500">
                          {s.totalOrdersCount} pedidos • {s.totalRidesCount} viajes • Ganancia:{" "}
                          <span className="font-bold text-slate-800">
                            {Number(s.netPayout || 0).toFixed(2)} Bs.
                          </span>
                        </p>

                        <p className="text-[10px] text-slate-400">
                          Registrado el {new Date(s.createdAt).toLocaleDateString("es-BO")}{" "}
                          {new Date(s.createdAt).toLocaleTimeString("es-BO", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {s.paidAt &&
                            ` • Pagado el ${new Date(s.paidAt).toLocaleDateString("es-BO")}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={isPaid ? "outline" : "primary"}
                          disabled={actionLoading}
                          onClick={() => handleTogglePaid(s.id, s.status)}
                          className={`text-xs h-8 rounded-xl font-bold ${
                            isPaid
                              ? "border-slate-200 text-slate-700 hover:bg-slate-100"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white"
                          }`}
                        >
                          {isPaid ? "Marcar Pendiente" : "Marcar Pagado"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* MODAL DE DETALLE Y LIQUIDACIÓN OFICIAL */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Cierre de Caja: ${selectedAudit?.rider.name || ""}`}
        maxWidth="2xl"
      >
        {selectedAudit && (
          <div className="space-y-4 text-xs">
            {/* Header Conductor */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900 text-sm">
                  {selectedAudit.rider.name}
                </p>
                <p className="text-slate-500 text-[11px]">
                  {selectedAudit.rider.vehicleType} • Placa {selectedAudit.rider.plateNumber} • Cel: {selectedAudit.rider.phone}
                </p>
              </div>
              <span className="text-xs bg-white border border-slate-200 font-bold px-2.5 py-1 rounded-xl text-slate-700">
                {selectedAudit.periodLabel}
              </span>
            </div>

            {/* Desglose Matemático del Balance */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-slate-300 font-medium">Ganancia Total del Conductor</span>
                <span className="text-base font-black text-emerald-400">
                  {selectedAudit.netEarned.toFixed(2)} Bs.
                </span>
              </div>

              <div className="space-y-1.5 text-[11px] text-slate-300">
                <div className="flex justify-between">
                  <span>Efectivo cobrado a clientes (en mano):</span>
                  <span className="font-bold text-amber-300">
                    {selectedAudit.totalCashCollectedInHand.toFixed(2)} Bs.
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal que pertenece a restaurantes:</span>
                  <span className="font-bold text-rose-300">
                    -{selectedAudit.cashRestaurantSubtotalOwed.toFixed(2)} Bs.
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Tarifas cobradas por QR a tu favor:</span>
                  <span className="font-bold text-emerald-300">
                    +{selectedAudit.totalDigitalOwedToRider.toFixed(2)} Bs.
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                    Balance Final
                  </p>
                  <p className="text-xs font-semibold text-white">
                    {selectedAudit.directionLabel}
                  </p>
                </div>
                <span className="text-xl font-black text-white">
                  {selectedAudit.balanceDifference.toFixed(2)} Bs.
                </span>
              </div>
            </div>

            {/* Lista de Pedidos Entregados */}
            <div>
              <h4 className="font-bold text-slate-900 mb-2 flex items-center justify-between">
                <span>Pedidos Entregados ({selectedAudit.orders.length})</span>
                <span className="text-[11px] font-normal text-slate-500">
                  Total Delivery: {selectedAudit.ordersDeliveryFeeTotal.toFixed(2)} Bs.
                </span>
              </h4>

              {selectedAudit.orders.length === 0 ? (
                <p className="text-slate-400 text-center py-2 italic text-[11px]">
                  Sin pedidos de delivery entregados en este periodo.
                </p>
              ) : (
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {selectedAudit.orders.map((o) => (
                    <div
                      key={o.id}
                      className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px]"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-slate-900">{o.orderNumber}</span>
                          <span className="text-slate-500">• {o.merchantName}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                              o.isCash
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {o.isCash ? "EFECTIVO" : "QR"}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Comida: {o.subtotal.toFixed(2)} Bs. • Envío: {o.deliveryFee.toFixed(2)} Bs.
                        </p>
                      </div>
                      <span className="font-bold text-slate-800">
                        {o.totalAmount.toFixed(2)} Bs.
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lista de Carreras Finalizadas */}
            <div>
              <h4 className="font-bold text-slate-900 mb-2 flex items-center justify-between">
                <span>Carreras de Mototaxi ({selectedAudit.rides.length})</span>
                <span className="text-[11px] font-normal text-slate-500">
                  Total Carreras: {selectedAudit.ridesFareTotal.toFixed(2)} Bs.
                </span>
              </h4>

              {selectedAudit.rides.length === 0 ? (
                <p className="text-slate-400 text-center py-2 italic text-[11px]">
                  Sin carreras de mototaxi finalizadas en este periodo.
                </p>
              ) : (
                <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                  {selectedAudit.rides.map((r) => (
                    <div
                      key={r.id}
                      className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px]"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-slate-900">{r.tripNumber}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                              r.isCash
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {r.isCash ? "EFECTIVO" : "QR"}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate max-w-xs">
                          {r.origin} ➔ {r.destination}
                        </p>
                      </div>
                      <span className="font-bold text-slate-800">
                        {r.fareAmount.toFixed(2)} Bs.
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Botones de Acción */}
            <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleCopyWhatsApp(
                    `🛵 *CIERRE DE CAJA — TROPIGO AI*\n📅 *Periodo:* ${
                      selectedAudit.periodLabel
                    }\n👤 *Conductor:* ${selectedAudit.rider.name}\n\n*Servicios:* ${
                      selectedAudit.totalServicesCount
                    } (${selectedAudit.totalOrdersCount} entregas, ${
                      selectedAudit.totalRidesCount
                    } carreras)\n*Tu Ganancia:* ${selectedAudit.netEarned.toFixed(
                      2
                    )} Bs.\n*Efectivo en mano:* ${selectedAudit.totalCashCollectedInHand.toFixed(
                      2
                    )} Bs.\n*Comida restaurantes:* ${selectedAudit.cashRestaurantSubtotalOwed.toFixed(
                      2
                    )} Bs.\n\n👉 *Balance final:* ${
                      selectedAudit.directionLabel
                    }\n\n_TropiGO AI • Ivirgarzama_`
                  )
                }
                className="text-xs h-9 rounded-xl font-bold flex items-center gap-1.5"
              >
                {copiedText ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Texto</span>
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={actionLoading}
                onClick={() => handleCreateSettlement(selectedAudit, false)}
                className="text-xs h-9 rounded-xl font-bold text-slate-700"
              >
                Guardar como Pendiente
              </Button>

              <Button
                size="sm"
                disabled={actionLoading}
                onClick={() => handleCreateSettlement(selectedAudit, true)}
                className="text-xs h-9 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                {actionLoading ? "Guardando..." : "Guardar y Liquidar (Pagado)"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
