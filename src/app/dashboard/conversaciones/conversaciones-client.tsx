"use client";

import { useState } from "react";
import {
  Search,
  User,
  Bot,
  UserCheck,
  Send,
  Sparkles,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  Cpu,
  Clock,
  Radio,
  Check,
} from "lucide-react";

interface ConversacionesClientProps {
  initialConversations: any[];
}

export function ConversacionesClient({ initialConversations }: ConversacionesClientProps) {
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState(initialConversations[0]?.id || null);
  const [filter, setFilter] = useState<"ALL" | "ATTENTION" | "WHATSAPP" | "WEB">("ALL");
  const [search, setSearch] = useState("");
  const [replyText, setReplyText] = useState("");
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});

  const activeConversation = conversations.find((c) => c.id === selectedId);

  // Filtrado de conversaciones
  const filtered = conversations.filter((c) => {
    if (filter === "ATTENTION" && c.status !== "human_takeover") return false;
    if (filter === "WHATSAPP" && c.channel !== "whatsapp") return false;
    if (filter === "WEB" && c.channel !== "webchat") return false;

    if (search) {
      const q = search.toLowerCase();
      const name = c.contact?.name?.toLowerCase() || "";
      const phone = c.contact?.phone || "";
      const email = c.contact?.email?.toLowerCase() || "";
      return name.includes(q) || phone.includes(q) || email.includes(q);
    }
    return true;
  });

  const handleToggleTakeover = async () => {
    if (!activeConversation) return;
    const nextStatus =
      activeConversation.status === "human_takeover" ? "ai_active" : "human_takeover";

    setConversations((prev) =>
      prev.map((c) => (c.id === activeConversation.id ? { ...c, status: nextStatus } : c))
    );

    try {
      await fetch("/api/conversations/toggle-takeover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeConversation.id, status: nextStatus }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendHumanReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeConversation) return;

    const newMsg = {
      id: `temp-${Date.now()}`,
      sender: "human",
      content: replyText,
      createdAt: new Date().toISOString(),
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? { ...c, messages: [...c.messages, newMsg] }
          : c
      )
    );

    const textToSend = replyText;
    setReplyText("");

    try {
      await fetch("/api/conversations/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversation.id,
          recipientPhone: activeConversation.contact?.phone,
          content: textToSend,
        }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const toggleTools = (msgId: string) => {
    setExpandedTools((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[740px] bg-white rounded-2xl border border-[#EAECF0] shadow-2xs overflow-hidden">
      {/* Columna Izquierda: Lista de Conversaciones */}
      <div className="lg:col-span-4 border-r border-[#EAECF0] flex flex-col h-full bg-[#FAFAFA]">
        {/* Buscador y Filtros */}
        <div className="p-4 border-b border-[#EAECF0] space-y-3 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-[#98A2B3] absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por paciente, teléfono o email..."
              className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl pl-9 pr-3 py-2 text-xs text-[#101828] focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="flex flex-wrap gap-1 text-xs">
            {[
              { id: "ALL", label: "Todas" },
              { id: "ATTENTION", label: "Necesitan atención" },
              { id: "WHATSAPP", label: "WhatsApp" },
              { id: "WEB", label: "Web" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as any)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  filter === tab.id
                    ? "bg-[#101828] text-white"
                    : "bg-white border border-[#D0D5DD] text-[#475467] hover:bg-[#F2F4F7]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#EAECF0]">
          {filtered.map((c) => {
            const isSelected = c.id === selectedId;
            const lastMsg = c.messages?.[c.messages.length - 1];
            const needsHuman = c.status === "human_takeover";

            return (
              <div
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`p-4 cursor-pointer transition-colors flex items-start gap-3 ${
                  isSelected ? "bg-white border-l-4 border-l-teal-600 shadow-2xs" : "hover:bg-[#F2F4F7]"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    needsHuman
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : "bg-teal-100 text-teal-800"
                  }`}
                >
                  {c.contact?.name?.[0] || "P"}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-xs text-[#101828] truncate">
                      {c.contact?.name || "Paciente"}
                    </p>
                    <span className="text-[10px] text-[#98A2B3]">
                      {new Date(c.lastMessageAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] bg-[#F2F4F7] text-[#475467] px-1.5 py-0.2 rounded font-medium">
                      {c.channel === "whatsapp" ? "WhatsApp" : "Web Chat"}
                    </span>
                    <span className="text-[11px] text-[#667085] truncate">
                      {c.contact?.phone || c.contact?.email}
                    </span>
                  </div>

                  <p className="text-xs text-[#475467] truncate mt-1">
                    {lastMsg?.content || "Sin mensajes"}
                  </p>

                  {needsHuman && (
                    <span className="inline-block mt-1 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-md font-bold">
                      ⚠️ Espera a una persona
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Columna Derecha: Conversación Abierta */}
      {activeConversation ? (
        <div className="lg:col-span-8 flex flex-col h-full bg-white">
          {/* Header */}
          <div className="p-4 border-b border-[#EAECF0] flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-700 text-white font-bold text-sm flex items-center justify-center">
                {activeConversation.contact?.name?.[0] || "P"}
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#101828]">
                  {activeConversation.contact?.name || "Paciente"}
                </h4>
                <div className="flex items-center gap-2 text-xs text-[#667085]">
                  <span>{activeConversation.contact?.phone || activeConversation.contact?.email}</span>
                  <span>•</span>
                  <span>Canal: {activeConversation.channel === "whatsapp" ? "WhatsApp" : "Web Chat"}</span>
                </div>
              </div>
            </div>

            {/* Botones Tomar el Control / Devolver al Asistente */}
            <button
              onClick={handleToggleTakeover}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-2xs ${
                activeConversation.status === "human_takeover"
                  ? "bg-teal-700 hover:bg-teal-800 text-white"
                  : "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300"
              }`}
            >
              {activeConversation.status === "human_takeover" ? (
                <>
                  <Bot className="w-4 h-4" />
                  <span>Devolver al asistente</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 text-amber-700" />
                  <span>Tomar el control</span>
                </>
              )}
            </button>
          </div>

          {/* Hilo de Mensajes con Burbujas Diferenciadas */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-[#F9FAFB]">
            {activeConversation.messages.map((m: any) => {
              const isCustomer = m.sender === "customer";
              const isHuman = m.sender === "human";
              const isAssistant = m.sender === "assistant";

              let tools: any[] = [];
              try {
                if (m.toolCallsJson) tools = JSON.parse(m.toolCallsJson);
              } catch (e) {}

              return (
                <div
                  key={m.id}
                  className={`flex gap-3 max-w-[80%] ${
                    isCustomer ? "mr-auto" : "ml-auto flex-row-reverse"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                      isCustomer
                        ? "bg-[#344054] text-white"
                        : isHuman
                        ? "bg-amber-600 text-white"
                        : "bg-teal-700 text-white"
                    }`}
                  >
                    {isCustomer ? "C" : isHuman ? "Tú" : "IA"}
                  </div>

                  <div className="space-y-1">
                    <div
                      className={`p-3.5 rounded-2xl text-xs whitespace-pre-wrap leading-relaxed shadow-2xs ${
                        isCustomer
                          ? "bg-white text-[#101828] border border-[#EAECF0] rounded-tl-none"
                          : isHuman
                          ? "bg-amber-50 text-amber-950 border border-amber-300 rounded-tr-none font-medium"
                          : "bg-teal-700 text-white rounded-tr-none"
                      }`}
                    >
                      {m.content}
                    </div>

                    {/* Icono que despliega las herramientas usadas por el asistente */}
                    {isAssistant && tools.length > 0 && (
                      <div>
                        <button
                          onClick={() => toggleTools(m.id)}
                          className="flex items-center gap-1 text-[11px] font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2 py-0.5 rounded-md transition-colors"
                        >
                          <Cpu className="w-3 h-3 text-teal-600" />
                          <span>Herramientas usadas ({tools.length})</span>
                          {expandedTools[m.id] ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>

                        {expandedTools[m.id] && (
                          <div className="mt-1.5 p-3 bg-white border border-[#EAECF0] rounded-xl space-y-2 text-[11px] shadow-sm">
                            {tools.map((t: any, i: number) => (
                              <div key={i} className="space-y-1 border-b border-[#EAECF0] pb-2 last:border-none last:pb-0">
                                <span className="font-mono font-bold text-teal-800">
                                  {t.tool}()
                                </span>
                                <pre className="bg-[#F8F9FA] p-1.5 rounded text-[10px] text-[#475467] font-mono overflow-x-auto">
                                  {JSON.stringify(t.args, null, 2)}
                                </pre>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div
                      className={`text-[10px] text-[#98A2B3] flex items-center gap-1 ${
                        isCustomer ? "justify-start" : "justify-end"
                      }`}
                    >
                      <span>
                        {isCustomer
                          ? "Paciente"
                          : isHuman
                          ? "Persona del equipo"
                          : "Asistente IA"}
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(m.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input de Respuesta Humana */}
          <div className="p-4 border-t border-[#EAECF0] bg-white">
            {activeConversation.status !== "human_takeover" ? (
              <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#EAECF0] flex items-center justify-between text-xs text-[#667085]">
                <span>
                  🤖 El asistente está respondiendo automáticamente en esta conversación.
                </span>
                <button
                  onClick={handleToggleTakeover}
                  className="text-xs font-semibold text-teal-700 hover:underline"
                >
                  Tomar el control para responder
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendHumanReply} className="flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Responde directamente al paciente desde el panel..."
                  className="flex-1 bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-4 py-2.5 text-xs text-[#101828] focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="bg-amber-600 hover:bg-amber-700 disabled:bg-[#D0D5DD] text-white p-2.5 rounded-xl transition-colors shrink-0 shadow-xs"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      ) : (
        <div className="lg:col-span-8 flex items-center justify-center text-xs text-[#667085]">
          Selecciona una conversación de la lista
        </div>
      )}
    </div>
  );
}
