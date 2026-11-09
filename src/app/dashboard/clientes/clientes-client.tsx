"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Users,
  Search,
  Phone,
  MapPin,
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  Brain,
  ShieldOff,
  Clock,
} from "lucide-react";

interface MemoryFactPreview {
  id: string;
  category: string;
  key: string;
  value: string;
  updatedAt: string;
}

interface CustomerItem {
  id: string;
  name: string | null;
  phone: string;
  defaultAddress: string | null;
  referencePoint: string | null;
  totalOrders: number;
  memoryOptOut: boolean;
  updatedAt: string;
  memoryFacts: MemoryFactPreview[];
  conversations: Array<{
    id: string;
    channel: string;
    status: string;
    lastMessageAt: string;
  }>;
  _count: {
    orders: number;
    conversations: number;
    memoryFacts: number;
    conversationSummaries: number;
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  PERFIL: "Perfil",
  PREFERENCIA: "Preferencia",
  DIRECCION: "Dirección",
  OBSERVACION: "Observación",
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Sin interacción";
  try {
    return new Date(value).toLocaleString("es-BO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export function ClientesClient({ initialCustomers }: { initialCustomers: CustomerItem[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return initialCustomers;
    return initialCustomers.filter(
      (customer) =>
        (customer.name || "").toLowerCase().includes(query) ||
        customer.phone.toLowerCase().includes(query)
    );
  }, [initialCustomers, search]);

  const stats = useMemo(() => {
    const withMemory = initialCustomers.filter(
      (customer) => customer._count.memoryFacts > 0 || customer._count.conversationSummaries > 0
    ).length;
    const optedOut = initialCustomers.filter((customer) => customer.memoryOptOut).length;
    return { withMemory, optedOut };
  }, [initialCustomers]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-[#EAECF0] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-[#667085]">
              Clientes reales
            </p>
            <p className="text-lg font-black text-[#101828]">{initialCustomers.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#EAECF0] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-[#667085]">
              Con memoria guardada
            </p>
            <p className="text-lg font-black text-[#101828]">{stats.withMemory}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#EAECF0] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <ShieldOff className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-[#667085]">
              Memoria desactivada
            </p>
            <p className="text-lg font-black text-[#101828]">{stats.optedOut}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-[#EAECF0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-[#98A2B3] absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre o número de WhatsApp..."
            className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl pl-9 pr-3 py-2 text-xs text-[#101828] focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <span className="text-xs text-[#667085]">
          Mostrando {filtered.length} de {initialCustomers.length} clientes
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-[#D0D5DD] rounded-3xl p-10 text-center space-y-2">
          <Users className="w-8 h-8 text-[#98A2B3] mx-auto" />
          <p className="font-bold text-sm text-[#101828]">No hay clientes para mostrar</p>
          <p className="text-xs text-[#667085] max-w-md mx-auto">
            Los clientes aparecen aquí cuando escriben por WhatsApp. La memoria se construye
            solo con datos duraderos que ellos comparten y que el administrador puede revisar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((customer) => {
            const lastConversation = customer.conversations[0];
            return (
              <div
                key={customer.id}
                className="bg-white p-5 rounded-3xl border border-[#EAECF0] shadow-2xs space-y-3 hover:border-emerald-300 transition-colors flex flex-col"
              >
                <div className="flex items-start justify-between gap-2 border-b border-[#EAECF0] pb-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                      {(customer.name || "C")[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-[#101828] truncate">
                        {customer.name || "Cliente WhatsApp"}
                      </h4>
                      <p className="text-[11px] text-[#667085] flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {customer.phone}
                      </p>
                    </div>
                  </div>

                  {customer.memoryOptOut ? (
                    <span className="text-[9px] font-black text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded shrink-0">
                      Memoria off
                    </span>
                  ) : (
                    <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded shrink-0">
                      Memoria IA
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 text-xs">
                  <p className="text-[#475467] flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">
                      {customer.defaultAddress || "Sin dirección registrada"}
                    </span>
                  </p>
                  {customer.referencePoint && (
                    <p className="text-[11px] text-[#667085] italic pl-5 line-clamp-1">
                      Ref: &ldquo;{customer.referencePoint}&rdquo;
                    </p>
                  )}
                  <p className="text-[11px] text-[#667085] flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-slate-400" />
                    Última interacción: {formatDateTime(lastConversation?.lastMessageAt || customer.updatedAt)}
                  </p>
                </div>

                <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200 text-xs space-y-1.5">
                  <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-900 tracking-wider">
                    <Sparkles className="w-3 h-3 text-emerald-700" />
                    <span>Memoria persistente</span>
                  </div>

                  {customer.memoryFacts.length > 0 ? (
                    <div className="space-y-1">
                      {customer.memoryFacts.map((fact) => (
                        <div
                          key={fact.id}
                          className="bg-white/80 p-1.5 rounded-lg border border-emerald-100 text-[11px]"
                        >
                          <span className="font-bold text-emerald-800">
                            {CATEGORY_LABELS[fact.category] || fact.category}:
                          </span>{" "}
                          <span className="text-slate-700 line-clamp-2">{fact.value}</span>
                        </div>
                      ))}
                      {customer._count.memoryFacts > 3 && (
                        <p className="text-[10px] text-emerald-800 font-bold">
                          +{customer._count.memoryFacts - 3} datos más
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#667085]">
                      Sin datos estructurados aún. Los resúmenes históricos se generan al
                      cerrar una conversación.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl py-1.5">
                    <p className="font-black text-sm text-[#101828]">{customer._count.orders}</p>
                    <p className="text-[#667085] font-bold flex items-center justify-center gap-0.5">
                      <ShoppingBag className="w-2.5 h-2.5" /> Pedidos
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl py-1.5">
                    <p className="font-black text-sm text-[#101828]">
                      {customer._count.conversations}
                    </p>
                    <p className="text-[#667085] font-bold flex items-center justify-center gap-0.5">
                      <MessageSquare className="w-2.5 h-2.5" /> Charlas
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl py-1.5">
                    <p className="font-black text-sm text-[#101828]">
                      {customer._count.conversationSummaries}
                    </p>
                    <p className="text-[#667085] font-bold flex items-center justify-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Resúmenes
                    </p>
                  </div>
                </div>

                <Link
                  href={`/dashboard/clientes/${customer.id}`}
                  className="mt-auto w-full inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl transition-colors"
                >
                  Ver memoria e historial
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
