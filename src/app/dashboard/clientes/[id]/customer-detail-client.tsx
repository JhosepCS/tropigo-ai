"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Brain,
  Sparkles,
  Pencil,
  Trash2,
  Save,
  X,
  Plus,
  ShieldCheck,
  ShieldOff,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  History,
  FileText,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Phone,
  MapPin,
  ShoppingBag,
  Clock,
  User,
  Bot,
  Headphones,
  Info,
} from "lucide-react";

interface MemoryFact {
  id: string;
  category: string;
  key: string;
  value: string;
  source: string;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Summary {
  id: string;
  customerId: string;
  conversationId: string;
  summaryText: string;
  topicsJson: string;
  messageCount: number;
  periodStart?: string | null;
  periodEnd?: string | null;
  generatedBy: string;
  createdAt: string;
  updatedAt: string;
  conversation?: {
    id: string;
    channel: string;
    status: string;
    createdAt: string;
    lastMessageAt: string;
  } | null;
}

interface Message {
  id: string;
  sender: string;
  content: string;
  mediaType?: string | null;
  createdAt: string;
}

interface Conversation {
  id: string;
  channel: string;
  status: string;
  createdAt: string;
  lastMessageAt: string;
  messages: Message[];
  summary?: { id: string; createdAt: string; messageCount: number } | null;
}

interface OrderPreview {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
}

interface CustomerDetail {
  id: string;
  name: string | null;
  phone: string;
  defaultAddress: string | null;
  referencePoint: string | null;
  memoryOptOut: boolean;
  createdAt: string;
  updatedAt: string;
  memoryFacts: MemoryFact[];
  conversationSummaries: Summary[];
  conversations: Conversation[];
  orders: OrderPreview[];
  _count: {
    orders: number;
    conversations: number;
    memoryFacts: number;
    conversationSummaries: number;
  };
}

const CATEGORY_ORDER = ["PERFIL", "PREFERENCIA", "DIRECCION", "OBSERVACION"];

const CATEGORY_LABELS: Record<string, string> = {
  PERFIL: "Perfil",
  PREFERENCIA: "Preferencia",
  DIRECCION: "Dirección habitual",
  OBSERVACION: "Observación útil",
};

const CATEGORY_STYLES: Record<string, string> = {
  PERFIL: "bg-blue-50 text-blue-700 border-blue-200",
  PREFERENCIA: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DIRECCION: "bg-indigo-50 text-indigo-700 border-indigo-200",
  OBSERVACION: "bg-amber-50 text-amber-800 border-amber-200",
};

const SOURCE_LABELS: Record<string, string> = {
  AI_WHATSAPP: "IA WhatsApp",
  CRM: "CRM",
  SYSTEM: "Sistema",
};

const CONVERSATION_STATUS: Record<string, { label: string; className: string }> = {
  AI_ACTIVE: { label: "IA activa", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  HUMAN_TAKEOVER: { label: "Atención humana", className: "bg-amber-50 text-amber-800 border-amber-200" },
  CLOSED: { label: "Cerrada", className: "bg-slate-100 text-slate-700 border-slate-200" },
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
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

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("es-BO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function senderMeta(sender: string) {
  const normalized = String(sender || "").toUpperCase();
  if (normalized === "CUSTOMER") {
    return { label: "Cliente", icon: User, className: "bg-slate-100 text-slate-700" };
  }
  if (normalized === "ASSISTANT") {
    return { label: "TropiBot", icon: Bot, className: "bg-emerald-100 text-emerald-800" };
  }
  if (normalized === "OPERATOR") {
    return { label: "Operador", icon: Headphones, className: "bg-indigo-100 text-indigo-800" };
  }
  return { label: "Sistema", icon: Info, className: "bg-amber-100 text-amber-800" };
}

export function CustomerMemoryDetailClient({ customer }: { customer: CustomerDetail }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"memory" | "summaries" | "history">("memory");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newCategory, setNewCategory] = useState("PREFERENCIA");
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState("PREFERENCIA");
  const [editKey, setEditKey] = useState("");
  const [editValue, setEditValue] = useState("");

  const [summaryConversationId, setSummaryConversationId] = useState("");
  const [expandedConversations, setExpandedConversations] = useState<Record<string, boolean>>({});

  const factsByCategory = useMemo(() => {
    const map = new Map<string, MemoryFact[]>();
    for (const fact of customer.memoryFacts) {
      const list = map.get(fact.category) || [];
      list.push(fact);
      map.set(fact.category, list);
    }
    return map;
  }, [customer.memoryFacts]);

  const conversationsWithoutSummary = useMemo(
    () => customer.conversations.filter((conversation) => !conversation.summary),
    [customer.conversations]
  );

  const resetMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const request = async (url: string, options?: RequestInit) => {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "No se pudo completar la operación.");
    }
    return data;
  };

  const refresh = () => {
    router.refresh();
  };

  const runAction = async (action: () => Promise<void>) => {
    resetMessages();
    setIsBusy(true);
    try {
      await action();
    } catch (actionError: any) {
      setError(actionError.message || "Ocurrió un error inesperado.");
    } finally {
      setIsBusy(false);
    }
  };

  const addFact = async (event: React.FormEvent) => {
    event.preventDefault();
    await runAction(async () => {
      await request(`/api/admin/customers/${customer.id}/memory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: newCategory, key: newKey, value: newValue }),
      });
      setNewKey("");
      setNewValue("");
      setSuccess("Dato de memoria guardado.");
      refresh();
    });
  };

  const startEdit = (fact: MemoryFact) => {
    resetMessages();
    setEditingId(fact.id);
    setEditCategory(fact.category);
    setEditKey(fact.key);
    setEditValue(fact.value);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditKey("");
    setEditValue("");
  };

  const saveEdit = async (factId: string) => {
    await runAction(async () => {
      await request(`/api/admin/customers/${customer.id}/memory/${factId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: editCategory,
          key: editKey,
          value: editValue,
        }),
      });
      cancelEdit();
      setSuccess("Dato de memoria actualizado.");
      refresh();
    });
  };

  const deleteFact = async (factId: string) => {
    if (!window.confirm("¿Eliminar este dato de memoria? Esta acción no se puede deshacer.")) {
      return;
    }
    await runAction(async () => {
      await request(`/api/admin/customers/${customer.id}/memory/${factId}`, {
        method: "DELETE",
      });
      setSuccess("Dato de memoria eliminado.");
      refresh();
    });
  };

  const clearAllMemory = async () => {
    if (
      !window.confirm(
        "¿Borrar TODA la memoria estructurada de este cliente? Los resúmenes históricos y el historial de conversaciones no se borran con esta acción."
      )
    ) {
      return;
    }
    await runAction(async () => {
      await request(`/api/admin/customers/${customer.id}/memory`, { method: "DELETE" });
      setSuccess("Toda la memoria estructurada fue eliminada.");
      refresh();
    });
  };

  const toggleOptOut = async () => {
    const nextValue = !customer.memoryOptOut;
    if (
      nextValue &&
      !window.confirm(
        "¿Desactivar la memoria de este cliente? La IA dejará de leer y guardar datos. Los datos existentes se conservan hasta que los elimines."
      )
    ) {
      return;
    }

    await runAction(async () => {
      await request(`/api/admin/customers/${customer.id}/opt-out`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memoryOptOut: nextValue }),
      });
      setSuccess(
        nextValue
          ? "Memoria desactivada. La IA ya no usará ni guardará datos de este cliente."
          : "Memoria activada. La IA podrá usar y guardar datos duraderos de este cliente."
      );
      refresh();
    });
  };

  const generateSummary = async (conversationId: string, force = false) => {
    if (!conversationId) {
      setError("Selecciona una conversación para resumir.");
      return;
    }
    await runAction(async () => {
      await request(`/api/admin/customers/${customer.id}/summaries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, force }),
      });
      setSummaryConversationId("");
      setSuccess(force ? "Resumen regenerado." : "Resumen generado.");
      refresh();
    });
  };

  const deleteSummary = async (summaryId: string) => {
    if (!window.confirm("¿Eliminar este resumen histórico? El historial de mensajes se conserva.")) {
      return;
    }
    await runAction(async () => {
      await request(`/api/admin/customers/${customer.id}/summaries/${summaryId}`, {
        method: "DELETE",
      });
      setSuccess("Resumen eliminado.");
      refresh();
    });
  };

  const clearSummaries = async () => {
    if (
      !window.confirm(
        "¿Borrar TODOS los resúmenes históricos de este cliente? El historial de mensajes se conserva."
      )
    ) {
      return;
    }
    await runAction(async () => {
      await request(`/api/admin/customers/${customer.id}/summaries`, { method: "DELETE" });
      setSuccess("Todos los resúmenes fueron eliminados.");
      refresh();
    });
  };

  const toggleConversation = (conversationId: string) => {
    setExpandedConversations((previous) => ({
      ...previous,
      [conversationId]: !previous[conversationId],
    }));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <Link
            href="/dashboard/clientes"
            className="mt-0.5 inline-flex items-center justify-center w-8 h-8 rounded-xl border border-[#D0D5DD] bg-white hover:bg-[#F2F4F7] text-[#475467]"
            aria-label="Volver a clientes"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-[#101828]">
                {customer.name || "Cliente WhatsApp"}
              </h2>
              {customer.memoryOptOut ? (
                <span className="text-[10px] font-black text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <ShieldOff className="w-3 h-3" />
                  Memoria desactivada
                </span>
              ) : (
                <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Memoria activa
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-[#667085] mt-1 flex-wrap">
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {customer.phone}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Cliente desde {formatDate(customer.createdAt)}
              </span>
            </div>
            <p className="text-xs text-[#667085] flex items-start gap-1 mt-1">
              <MapPin className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                {customer.defaultAddress || "Sin dirección registrada"}
                {customer.referencePoint ? ` (Ref: ${customer.referencePoint})` : ""}
              </span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          {[
            { label: "Pedidos", value: customer._count.orders, icon: ShoppingBag },
            { label: "Charlas", value: customer._count.conversations, icon: MessageSquare },
            { label: "Datos", value: customer._count.memoryFacts, icon: Brain },
            { label: "Resúmenes", value: customer._count.conversationSummaries, icon: FileText },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white border border-[#EAECF0] rounded-xl px-3 py-2 min-w-[74px]"
            >
              <stat.icon className="w-3.5 h-3.5 text-emerald-600 mx-auto mb-0.5" />
              <p className="text-sm font-black text-[#101828]">{stat.value}</p>
              <p className="text-[9px] uppercase tracking-wider font-bold text-[#667085]">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-[#475467]">
        <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <p>
          La memoria se usa únicamente para este cliente. No se guardan tarjetas, cuentas,
          documentos, contraseñas ni diagnósticos. Al desactivarla, la IA deja de leer y escribir
          memoria, pero los datos existentes permanecen hasta que los elimines manualmente.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {[
          { id: "memory" as const, label: "Memoria estructurada", icon: Brain },
          { id: "summaries" as const, label: "Resúmenes históricos", icon: FileText },
          { id: "history" as const, label: "Historial de conversaciones", icon: History },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id);
              resetMessages();
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
              activeTab === tab.id
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-[#475467] border-[#D0D5DD] hover:bg-[#F2F4F7]"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "memory" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-[#EAECF0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-bold text-xs text-[#101828]">
                {customer.memoryOptOut
                  ? "La IA no está usando la memoria de este cliente"
                  : "La IA puede usar y ampliar esta memoria"}
              </p>
              <p className="text-[11px] text-[#667085] mt-0.5">
                {customer.memoryOptOut
                  ? "Los datos existentes se conservan, pero no se inyectan al prompt ni se aceptan nuevos datos desde la IA."
                  : "Solo se guardan datos duraderos compartidos por el cliente. La IA no puede leer memoria de otros clientes."}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleOptOut}
              disabled={isBusy}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors disabled:opacity-50 ${
                customer.memoryOptOut
                  ? "bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800"
                  : "bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-800"
              }`}
            >
              {customer.memoryOptOut ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Activar memoria
                </>
              ) : (
                <>
                  <ShieldOff className="w-3.5 h-3.5" />
                  Desactivar memoria
                </>
              )}
            </button>
          </div>

          <form
            onSubmit={addFact}
            className="bg-white p-4 rounded-2xl border border-[#EAECF0] space-y-3"
          >
            <div className="flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-emerald-600" />
              <p className="font-bold text-xs text-[#101828]">Agregar dato de memoria</p>
            </div>
            <p className="text-[11px] text-[#667085]">
              El administrador puede corregir o completar lo que la IA recuerda. No agregues datos
              sensibles: el sistema los rechazará.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
                disabled={customer.memoryOptOut || isBusy}
                className="bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-xs text-[#101828] font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
              >
                {CATEGORY_ORDER.map((category) => (
                  <option key={category} value={category}>
                    {CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={newKey}
                onChange={(event) => setNewKey(event.target.value)}
                disabled={customer.memoryOptOut || isBusy}
                placeholder="Clave (ej: sin_cebolla)"
                className="bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
              />
              <input
                type="text"
                value={newValue}
                onChange={(event) => setNewValue(event.target.value)}
                disabled={customer.memoryOptOut || isBusy}
                placeholder="Valor (ej: siempre pide sin cebolla)"
                className="bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-[#98A2B3]">
                {customer.memoryOptOut
                  ? "Activa la memoria para agregar datos."
                  : "Máximo 40 datos por cliente. Se deduplican por categoría y clave."}
              </span>
              <button
                type="submit"
                disabled={customer.memoryOptOut || isBusy || !newKey.trim() || !newValue.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
              >
                {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Guardar dato
              </button>
            </div>
          </form>

          {customer.memoryFacts.length === 0 ? (
            <div className="bg-white border border-dashed border-[#D0D5DD] rounded-3xl p-8 text-center space-y-2">
              <Sparkles className="w-7 h-7 text-[#98A2B3] mx-auto" />
              <p className="font-bold text-sm text-[#101828]">Sin memoria estructurada</p>
              <p className="text-xs text-[#667085] max-w-md mx-auto">
                La IA guardará aquí solo datos duraderos que el cliente comparta, como su nombre
                preferido, restricciones alimentarias o su dirección habitual.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {CATEGORY_ORDER.filter((category) => (factsByCategory.get(category) || []).length > 0).map(
                (category) => (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${CATEGORY_STYLES[category]}`}
                      >
                        {CATEGORY_LABELS[category]}
                      </span>
                      <span className="text-[10px] text-[#98A2B3]">
                        {(factsByCategory.get(category) || []).length} dato(s)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {(factsByCategory.get(category) || []).map((fact) => {
                        const isEditing = editingId === fact.id;
                        return (
                          <div
                            key={fact.id}
                            className="bg-white p-4 rounded-2xl border border-[#EAECF0] space-y-2"
                          >
                            {isEditing ? (
                              <div className="space-y-2">
                                <select
                                  value={editCategory}
                                  onChange={(event) => setEditCategory(event.target.value)}
                                  className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-xs text-[#101828] font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                >
                                  {CATEGORY_ORDER.map((item) => (
                                    <option key={item} value={item}>
                                      {CATEGORY_LABELS[item]}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  value={editKey}
                                  onChange={(event) => setEditKey(event.target.value)}
                                  className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                                <textarea
                                  value={editValue}
                                  onChange={(event) => setEditValue(event.target.value)}
                                  rows={2}
                                  className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={cancelEdit}
                                    disabled={isBusy}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border border-[#D0D5DD] bg-white hover:bg-[#F2F4F7] text-[#475467] disabled:opacity-50"
                                  >
                                    <X className="w-3 h-3" />
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => saveEdit(fact.id)}
                                    disabled={isBusy || !editKey.trim() || !editValue.trim()}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                                  >
                                    {isBusy ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Save className="w-3 h-3" />
                                    )}
                                    Guardar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="font-mono text-[10px] font-bold text-[#667085] uppercase tracking-wider">
                                      {fact.key}
                                    </p>
                                    <p className="text-xs text-[#101828] mt-0.5 whitespace-pre-wrap">
                                      {fact.value}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => startEdit(fact)}
                                      disabled={isBusy}
                                      className="p-1.5 rounded-lg border border-[#D0D5DD] bg-white hover:bg-[#F2F4F7] text-[#475467] disabled:opacity-50"
                                      aria-label="Editar dato"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteFact(fact.id)}
                                      disabled={isBusy}
                                      className="p-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 disabled:opacity-50"
                                      aria-label="Eliminar dato"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                                <p className="text-[10px] text-[#98A2B3]">
                                  {SOURCE_LABELS[fact.source] || fact.source} • actualizado{" "}
                                  {formatDateTime(fact.updatedAt)}
                                </p>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={clearAllMemory}
                  disabled={isBusy}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Borrar toda la memoria estructurada
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "summaries" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-[#EAECF0] space-y-3">
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-600" />
              <p className="font-bold text-xs text-[#101828]">Generar resumen histórico</p>
            </div>
            <p className="text-[11px] text-[#667085]">
              El resumen se genera de forma determinística a partir de los mensajes reales:
              temas, pedidos mencionados, preferencias, direcciones y pendientes. No usa modelos
              pagos ni inventa información. Al volver después de varios días, la conversación
              anterior se resume automáticamente.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={summaryConversationId}
                onChange={(event) => setSummaryConversationId(event.target.value)}
                className="flex-1 bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-xs text-[#101828] font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">Seleccionar conversación...</option>
                {customer.conversations.map((conversation) => (
                  <option key={conversation.id} value={conversation.id}>
                    {formatDateTime(conversation.lastMessageAt)} • {conversation.messages.length} mensajes
                    {conversation.summary ? " • ya resumida" : ""}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => generateSummary(summaryConversationId)}
                disabled={isBusy || !summaryConversationId}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
              >
                {isBusy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Generar resumen
              </button>
            </div>
            {conversationsWithoutSummary.length === 0 && customer.conversations.length > 0 && (
              <p className="text-[10px] text-[#98A2B3]">
                Todas las conversaciones visibles ya tienen resumen. Puedes regenerar uno desde el
                historial.
              </p>
            )}
          </div>

          {customer.conversationSummaries.length === 0 ? (
            <div className="bg-white border border-dashed border-[#D0D5DD] rounded-3xl p-8 text-center space-y-2">
              <History className="w-7 h-7 text-[#98A2B3] mx-auto" />
              <p className="font-bold text-sm text-[#101828]">Sin resúmenes históricos</p>
              <p className="text-xs text-[#667085] max-w-md mx-auto">
                Los resúmenes permiten que la IA recuerde lo importante de conversaciones anteriores
                sin arrastrar todos los mensajes. Se crean al cerrar una sesión o manualmente aquí.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {customer.conversationSummaries.map((summary) => (
                <div
                  key={summary.id}
                  className="bg-white p-4 rounded-2xl border border-[#EAECF0] space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-black text-[#101828]">
                        {formatDate(summary.periodStart || summary.createdAt)} —{" "}
                        {formatDate(summary.periodEnd || summary.createdAt)}
                      </p>
                      <p className="text-[10px] text-[#667085]">
                        {summary.messageCount} mensajes •{" "}
                        {summary.generatedBy === "CRM" ? "Generado desde CRM" : "Generado automáticamente"} •{" "}
                        {summary.conversation?.channel === "WHATSAPP" ? "WhatsApp" : "Web"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteSummary(summary.id)}
                      disabled={isBusy}
                      className="p-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 disabled:opacity-50 shrink-0"
                      aria-label="Eliminar resumen"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-xs text-[#344054] whitespace-pre-wrap bg-[#F9FAFB] border border-[#EAECF0] rounded-xl p-3">
                    {summary.summaryText}
                  </p>
                  {summary.conversation && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => generateSummary(summary.conversationId, true)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-900 disabled:opacity-50"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Regenerar con los mensajes actuales
                      </button>
                    </div>
                  )}
                </div>
              ))}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={clearSummaries}
                  disabled={isBusy}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Borrar todos los resúmenes
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-4">
          {customer.conversations.length === 0 ? (
            <div className="bg-white border border-dashed border-[#D0D5DD] rounded-3xl p-8 text-center space-y-2">
              <MessageSquare className="w-7 h-7 text-[#98A2B3] mx-auto" />
              <p className="font-bold text-sm text-[#101828]">Sin conversaciones registradas</p>
              <p className="text-xs text-[#667085]">
                Cuando el cliente escriba por WhatsApp, su historial aparecerá aquí.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {customer.conversations.map((conversation) => {
                const status = CONVERSATION_STATUS[conversation.status] || {
                  label: conversation.status,
                  className: "bg-slate-100 text-slate-700 border-slate-200",
                };
                const isExpanded = Boolean(expandedConversations[conversation.id]);

                return (
                  <div
                    key={conversation.id}
                    className="bg-white rounded-2xl border border-[#EAECF0] overflow-hidden"
                  >
                    <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-bold text-[#101828]">
                              {conversation.channel === "WHATSAPP" ? "WhatsApp" : "Web"} •{" "}
                              {conversation.messages.length} mensajes
                            </p>
                            <span
                              className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${status.className}`}
                            >
                              {status.label}
                            </span>
                            {conversation.summary && (
                              <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                                Resumida
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-[#667085] mt-0.5">
                            {formatDateTime(conversation.createdAt)} —{" "}
                            {formatDateTime(conversation.lastMessageAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            generateSummary(conversation.id, Boolean(conversation.summary))
                          }
                          disabled={isBusy}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 disabled:opacity-50"
                        >
                          <FileText className="w-3 h-3" />
                          {conversation.summary ? "Regenerar resumen" : "Generar resumen"}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleConversation(conversation.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold border border-[#D0D5DD] bg-white hover:bg-[#F2F4F7] text-[#475467]"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                          {isExpanded ? "Ocultar" : "Ver mensajes"}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-[#EAECF0] bg-[#F9FAFB] p-3 space-y-2 max-h-[520px] overflow-y-auto">
                        {conversation.messages.length === 0 ? (
                          <p className="text-[11px] text-[#667085] text-center py-4">
                            Esta conversación no tiene mensajes guardados.
                          </p>
                        ) : (
                          conversation.messages.map((message) => {
                            const meta = senderMeta(message.sender);
                            return (
                              <div
                                key={message.id}
                                className="bg-white border border-[#EAECF0] rounded-xl p-2.5"
                              >
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span
                                    className={`inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded ${meta.className}`}
                                  >
                                    <meta.icon className="w-2.5 h-2.5" />
                                    {meta.label}
                                  </span>
                                  <span className="text-[9px] text-[#98A2B3]">
                                    {formatDateTime(message.createdAt)}
                                  </span>
                                </div>
                                <p className="text-[11px] text-[#344054] whitespace-pre-wrap">
                                  {message.content}
                                </p>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {customer.orders.length > 0 && (
            <div className="bg-white p-4 rounded-2xl border border-[#EAECF0] space-y-2">
              <div className="flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                <p className="font-bold text-xs text-[#101828]">Pedidos recientes</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {customer.orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between gap-2 bg-[#F9FAFB] border border-[#EAECF0] rounded-xl px-3 py-2 text-[11px]"
                  >
                    <div>
                      <p className="font-mono font-bold text-[#101828]">{order.orderNumber}</p>
                      <p className="text-[10px] text-[#667085]">
                        {formatDateTime(order.createdAt)} • {order.status}
                      </p>
                    </div>
                    <span className="font-black text-emerald-700">
                      {Number(order.totalAmount || 0).toFixed(2)} Bs.
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
