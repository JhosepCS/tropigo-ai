"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Gift,
  QrCode,
  Plus,
  CheckCircle2,
  Copy,
  Printer,
  Search,
  AlertCircle,
  Loader2,
  Sparkles,
  Phone,
  MapPin,
  BadgeCheck,
  ExternalLink,
  User,
} from "lucide-react";

interface CustomerListItem {
  id: string;
  name: string | null;
  phone: string;
  loyaltyCode: string | null;
  loyaltyStamps: number;
  loyaltyTotalEarned: number;
  loyaltyRewardsRedeemed: number;
  totalOrders: number;
  rewardAvailable: boolean;
}

interface SelectedCard {
  customerId: string;
  customerName: string;
  code: string;
  stamps: number;
  stampsRequired: number;
  stampsNeeded: number;
  rewardAvailable: boolean;
  rewardsRedeemed: number;
  totalEarned: number;
  qrUrl: string;
  programEnabled: boolean;
  rewardDescription: string;
  phone: string;
  totalOrders: number;
  qrDataUrl: string;
}

interface SettingsInfo {
  enabled: boolean;
  stampsRequired: number;
  stampsNeeded: number;
  rewardDescription: string;
  businessName: string;
  businessPhone: string;
  businessAddress: string;
}

export function FidelidadClient({
  customers,
  selectedCard,
  settings,
  search,
}: {
  customers: CustomerListItem[];
  selectedCard: SelectedCard | null;
  settings: SettingsInfo;
  search: string;
}) {
  const router = useRouter();
  const [action, setAction] = useState<"stamp" | "redeem" | null>(null);
  const [message, setMessage] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  const runAction = async (kind: "stamp" | "redeem") => {
    if (!selectedCard) return;
    setAction(kind);
    setMessage(null);
    try {
      const res = await fetch(`/api/loyalty/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: selectedCard.customerId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo actualizar la tarjeta.");
      }
      setMessage({
        type: "ok",
        text:
          kind === "stamp"
            ? "Sello agregado correctamente."
            : "Premio canjeado. La tarjeta volvió a cero.",
      });
      router.refresh();
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "No se pudo actualizar la tarjeta.",
      });
    } finally {
      setAction(null);
    }
  };

  const copyLink = async () => {
    if (!selectedCard) return;
    try {
      await navigator.clipboard.writeText(selectedCard.qrUrl);
      setMessage({ type: "ok", text: "Enlace de la tarjeta copiado." });
    } catch {
      setMessage({
        type: "error",
        text: `Copia este enlace: ${selectedCard.qrUrl}`,
      });
    }
  };

  const printCard = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #tarjeta-fidelidad, #tarjeta-fidelidad * { visibility: visible !important; }
          #tarjeta-fidelidad {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Fidelidad & Tarjetas de Sellos
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Un sello por pedido entregado. Al completar la tarjeta, el pedido
            número {settings.stampsRequired} es gratis. Cada cliente tiene su QR
            personal.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-bold text-emerald-800">
            {settings.stampsNeeded} sellos = premio
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600">
            {settings.rewardDescription}
          </span>
        </div>
      </div>

      {!settings.enabled && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-800">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            El programa de fidelidad está desactivado. Puedes activarlo en{" "}
            <Link href="/dashboard/ajustes" className="font-bold underline">
              Ajustes Generales
            </Link>
            .
          </span>
        </div>
      )}

      {message && (
        <div
          className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-[11px] ${
            message.type === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {message.type === "ok" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
        {/* Lista de clientes */}
        <div className="bg-white rounded-3xl border border-[#EAECF0] p-4 shadow-2xs space-y-3 no-print">
          <form action="/dashboard/fidelidad" className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                name="search"
                defaultValue={search}
                placeholder="Nombre, teléfono o código..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-400"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-emerald-700"
            >
              Buscar
            </button>
          </form>

          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
            {customers.length} cliente(s)
          </div>

          <div className="space-y-1.5 max-h-[620px] overflow-y-auto pr-1">
            {customers.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-[11px] text-slate-500">
                No se encontraron clientes con ese criterio.
              </div>
            )}

            {customers.map((customer) => {
              const isSelected = selectedCard?.customerId === customer.id;
              return (
                <Link
                  key={customer.id}
                  href={`/dashboard/fidelidad?${new URLSearchParams({
                    ...(search ? { search } : {}),
                    customer: customer.id,
                  }).toString()}`}
                  className={`block rounded-2xl border px-3 py-2.5 transition-all ${
                    isSelected
                      ? "border-emerald-300 bg-emerald-50/70"
                      : "border-slate-100 bg-white hover:border-emerald-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-900">
                        {customer.name || "Cliente TropiGO"}
                      </p>
                      <p className="truncate text-[10px] text-slate-500">
                        {customer.phone}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[9px] text-slate-400">
                        {customer.loyaltyCode}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block text-sm font-black text-emerald-700">
                        {customer.loyaltyStamps}/{settings.stampsNeeded}
                      </span>
                      {customer.rewardAvailable && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                          <Gift className="w-2.5 h-2.5" />
                          Premio
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Tarjeta seleccionada */}
        {selectedCard ? (
          <div className="space-y-3">
            <div
              id="tarjeta-fidelidad"
              className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm"
            >
              <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-500 px-5 py-4 text-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100">
                      {settings.businessName}
                    </p>
                    <h3 className="mt-0.5 text-lg font-black tracking-tight">
                      Tarjeta de Fidelidad
                    </h3>
                    <p className="mt-0.5 text-[11px] text-emerald-50">
                      {selectedCard.rewardDescription}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/15 p-2 backdrop-blur">
                    <Gift className="w-6 h-6" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_190px] gap-4 p-5">
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Cliente
                    </p>
                    <p className="text-base font-black text-slate-900">
                      {selectedCard.customerName}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                      <Phone className="w-3 h-3" />
                      {selectedCard.phone}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Sellos
                      </p>
                      <p className="text-[10px] font-bold text-emerald-700">
                        {selectedCard.stamps} de {selectedCard.stampsNeeded}
                      </p>
                    </div>
                    <div className="mt-1.5 grid grid-cols-5 gap-1.5">
                      {Array.from({ length: selectedCard.stampsNeeded }).map(
                        (_, index) => {
                          const filled = index < selectedCard.stamps;
                          return (
                            <div
                              key={index}
                              className={`flex aspect-square items-center justify-center rounded-full border-2 text-[10px] font-black ${
                                filled
                                  ? "border-emerald-600 bg-emerald-600 text-white"
                                  : "border-dashed border-slate-300 bg-slate-50 text-slate-300"
                              }`}
                            >
                              {filled ? (
                                <BadgeCheck className="w-4 h-4" />
                              ) : (
                                index + 1
                              )}
                            </div>
                          );
                        }
                      )}
                      <div
                        className={`flex aspect-square items-center justify-center rounded-full border-2 ${
                          selectedCard.rewardAvailable
                            ? "border-amber-400 bg-amber-100 text-amber-700"
                            : "border-dashed border-amber-300 bg-amber-50/60 text-amber-400"
                        }`}
                        title={selectedCard.rewardDescription}
                      >
                        <Gift className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {selectedCard.rewardAvailable ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                      <p className="flex items-center gap-1.5 text-[11px] font-black text-amber-800">
                        <Sparkles className="w-3.5 h-3.5" />
                        ¡Premio disponible!
                      </p>
                      <p className="mt-0.5 text-[10px] text-amber-700">
                        El próximo pedido confirmado se aplica como gratis
                        automáticamente. También puedes canjearlo aquí si la
                        entrega fue presencial.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-2.5">
                      <p className="text-[11px] font-bold text-emerald-800">
                        Faltan{" "}
                        {Math.max(
                          0,
                          selectedCard.stampsNeeded - selectedCard.stamps
                        )}{" "}
                        sello(s) para el premio.
                      </p>
                      <p className="mt-0.5 text-[10px] text-emerald-700">
                        Cada pedido entregado suma un sello. El pedido número{" "}
                        {selectedCard.stampsRequired} es gratis.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-2 py-1.5">
                      <p className="text-[9px] font-bold uppercase text-slate-400">
                        Pedidos
                      </p>
                      <p className="text-sm font-black text-slate-800">
                        {selectedCard.totalOrders}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-2 py-1.5">
                      <p className="text-[9px] font-bold uppercase text-slate-400">
                        Sellos ganados
                      </p>
                      <p className="text-sm font-black text-slate-800">
                        {selectedCard.totalEarned}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-2 py-1.5">
                      <p className="text-[9px] font-bold uppercase text-slate-400">
                        Premios canjeados
                      </p>
                      <p className="text-sm font-black text-slate-800">
                        {selectedCard.rewardsRedeemed}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                  <img
                    src={selectedCard.qrDataUrl}
                    alt={`QR de fidelidad de ${selectedCard.customerName}`}
                    className="h-36 w-36 rounded-xl bg-white p-1 shadow-2xs"
                  />
                  <p className="text-center font-mono text-[10px] font-bold text-slate-600">
                    {selectedCard.code}
                  </p>
                  <p className="flex items-center gap-1 text-center text-[9px] text-slate-400">
                    <QrCode className="w-3 h-3" />
                    Escanea para abrir la tarjeta
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-2.5 text-[9px] text-slate-400">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {settings.businessAddress}
                </span>
                <span className="font-mono">{selectedCard.code}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 no-print">
              <button
                type="button"
                onClick={() => runAction("stamp")}
                disabled={
                  action !== null ||
                  selectedCard.rewardAvailable ||
                  !settings.enabled
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {action === "stamp" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                Agregar sello
              </button>

              <button
                type="button"
                onClick={() => runAction("redeem")}
                disabled={
                  action !== null ||
                  !selectedCard.rewardAvailable ||
                  !settings.enabled
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-[11px] font-bold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {action === "redeem" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Gift className="w-3.5 h-3.5" />
                )}
                Canjear premio
              </button>

              <button
                type="button"
                onClick={copyLink}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
              >
                <Copy className="w-3.5 h-3.5" />
                Copiar enlace
              </button>

              <button
                type="button"
                onClick={printCard}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir tarjeta
              </button>

              <Link
                href={selectedCard.qrUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ver tarjeta pública
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <User className="w-10 h-10 text-slate-300" />
            <p className="mt-2 text-sm font-bold text-slate-700">
              Selecciona un cliente
            </p>
            <p className="mt-1 max-w-sm text-[11px] text-slate-500">
              Busca por nombre, teléfono o código para ver su tarjeta de sellos,
              su QR personal y canjear premios.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
