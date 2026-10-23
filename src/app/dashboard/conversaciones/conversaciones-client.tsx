"use client";

import { useState } from "react";
import {
  Search,
  User,
  Bot,
  Send,
  UserCheck,
  MapPin,
  Mic,
  Sparkles,
  Phone,
  Clock,
  Shield,
} from "lucide-react";

interface ConversacionesClientProps {
  initialConversations: any[];
}

export function ConversacionesClient({
  initialConversations,
}: ConversacionesClientProps) {
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState(initialConversations[0]?.id || null);
  const [replyText, setReplyText] = useState("");
  const [filter, setFilter] = useState<"ALL" | "TAKEOVER" | "WHATSAPP">("ALL");
  const [search, setSearch] = useState("");

  const activeConversation = conversations.find((c) => c.id === selectedId);

  const filteredConversations = conversations.filter((c) => {
    if (filter === "TAKEOVER" && c.status !== "HUMAN_TAKEOVER") return false;
    if (filter === "WHATSAPP" && c.channel !== "WHATSAPP") return false;
    if (search) {
      const q = search.toLowerCase();
      const name = c.customer?.name?.toLowerCase() || "";
      const phone = c.customer?.phone || "";
      return name.includes(q) || phone.includes(q);
    }
    return true;
  });

  const handleToggleTakeover = async () => {
    if (!activeConversation) return;
    const newStatus =
      activeConversation.status === "HUMAN_TAKEOVER"
        ? "AI_ACTIVE"
        : "HUMAN_TAKEOVER";

    setConversations((prev) =>
      prev.map((c) => (c.id === activeConversation.id ? { ...c, status: newStatus } : c))
    );

    try {
      await fetch("/api/conversations/toggle-takeover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeConversation.id, status: newStatus }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendHumanReply = async () => {
    if (!replyText.trim() || !activeConversation) return;

    const newMsg = {
      id: `temp-${Date.now()}`,
      sender: "HUMAN",
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
          recipientPhone: activeConversation.customer?.phone,
          content: textToSend,
        }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[720px] bg-white rounded-2xl border border-[#EAECF0] shadow-xs overflow-hidden">
      {/* Columna Izquierda: Lista de Chats */}
      <div className="lg:col-span-4 border-r border-[#EAECF0] flex flex-col h-full bg-[#FAFAFA]">
        {/* Filtros y Buscador */}
        <div className="p-4 border-b border-[#EAECF0] space-y-3 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-[#98A2B3] absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente o teléfono..."
              className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl pl-9 pr-3 py-2 text-xs text-[#101828] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex gap-1.5 text-xs">
            <button
              onClick={() => setFilter("ALL")}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                filter === "ALL"
                  ? "bg-[#101828] text-white"
                  : "bg-white border border-[#D0D5DD] text-[#475467]"
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilter("TAKEOVER")}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                filter === "TAKEOVER"
                  ? "bg-amber-600 text-white"
                  : "bg-white border border-[#D0D5DD] text-[#475467]"
              }`}
            >
              En Control Humano
            </button>
            <button
              onClick={() => setFilter("WHATSAPP")}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                filter === "WHATSAPP"
                  ? "bg-emerald-700 text-white"
                  : "bg-white border border-[#D0D5DD] text-[#475467]"
              }`}
            >
              WhatsApp
            </button>
          </div>
        </div>

        {/* Lista de Conversaciones */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#EAECF0]">
          {filteredConversations.map((c) => {
            const isSelected = c.id === selectedId;
            const lastMsg = c.messages?.[c.messages.length - 1];

            return (
              <div
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`p-4 cursor-pointer transition-colors flex items-start gap-3 ${
                  isSelected ? "bg-white border-l-4 border-l-emerald-600" : "hover:bg-[#F2F4F7]"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-xs flex items-center justify-center shrink-0">
                  {c.customer?.name?.[0] || "C"}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-xs text-[#101828] truncate">
                      {c.customer?.name || "Cliente WhatsApp"}
                    </p>
                    <span className="text-[10px] text-[#98A2B3]">
                      {new Date(c.lastMessageAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#667085] truncate mt-0.5">
                    {c.customer?.phone}
                  </p>

                  <p className="text-xs text-[#475467] truncate mt-1">
                    {lastMsg?.content || "Sin mensajes"}
                  </p>

                  {c.status === "HUMAN_TAKEOVER" && (
                    <span className="inline-block mt-1 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-md font-medium">
                      Control Humano
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Columna Derecha: Chat Abierto */}
      {activeConversation ? (
        <div className="lg:col-span-8 flex flex-col h-full bg-white">
          {/* Header del Chat */}
          <div className="p-4 border-b border-[#EAECF0] flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center">
                {activeConversation.customer?.name?.[0] || "C"}
              </div>
              <div>
                <h4 className="font-semibold text-sm text-[#101828]">
                  {activeConversation.customer?.name || "Cliente WhatsApp"}
                </h4>
                <div className="flex items-center gap-2 text-xs text-[#667085]">
                  <span>{activeConversation.customer?.phone}</span>
                  <span>•</span>
                  <span>{activeConversation.customer?.defaultAddress || "Ivirgarzama"}</span>
                </div>
              </div>
            </div>

            {/* Botón de Tomar / Devolver Control */}
            <button
              onClick={handleToggleTakeover}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeConversation.status === "HUMAN_TAKEOVER"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  : "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300"
              }`}
            >
              {activeConversation.status === "HUMAN_TAKEOVER" ? (
                <>
                  <Bot className="w-4 h-4" />
                  <span>Devolver al Asistente IA</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 text-amber-600" />
                  <span>Tomar el Control (Pausar Bot)</span>
                </>
              )}
            </button>
          </div>

          {/* Mensajes del Hilo */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-[#F9FAFB]">
            {activeConversation.messages.map((m: any) => {
              const isCustomer = m.sender === "CUSTOMER";
              const isHuman = m.sender === "HUMAN";

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
                        : "bg-emerald-600 text-white"
                    }`}
                  >
                    {isCustomer ? "C" : isHuman ? "H" : "IA"}
                  </div>

                  <div className="space-y-1">
                    <div
                      className={`p-3.5 rounded-2xl text-xs whitespace-pre-wrap leading-relaxed shadow-xs ${
                        isCustomer
                          ? "bg-white text-[#101828] border border-[#EAECF0] rounded-tl-none"
                          : isHuman
                          ? "bg-amber-50 text-amber-950 border border-amber-200 rounded-tr-none"
                          : "bg-emerald-700 text-white rounded-tr-none"
                      }`}
                    >
                      {m.content}
                    </div>

                    <div
                      className={`text-[10px] text-[#98A2B3] flex items-center gap-1 ${
                        isCustomer ? "justify-start" : "justify-end"
                      }`}
                    >
                      <span>
                        {isCustomer
                          ? "Cliente"
                          : isHuman
                          ? "Despachador (Tú)"
                          : "TropiBot IA"}
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
            {activeConversation.status !== "HUMAN_TAKEOVER" ? (
              <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#EAECF0] flex items-center justify-between text-xs text-[#667085]">
                <span>
                  🤖 <strong>TropiBot</strong> está atendiendo activamente esta conversación.
                </span>
                <button
                  onClick={handleToggleTakeover}
                  className="text-xs font-semibold text-emerald-700 hover:underline"
                >
                  Tomar control para responder
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendHumanReply();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Escribe un mensaje como operador de Tropigo..."
                  className="flex-1 bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-4 py-2.5 text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-[#D0D5DD] text-white p-2.5 rounded-xl transition-colors shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      ) : (
        <div className="lg:col-span-8 flex items-center justify-center text-xs text-[#667085]">
          Selecciona una conversación para ver los mensajes
        </div>
      )}
    </div>
  );
}
