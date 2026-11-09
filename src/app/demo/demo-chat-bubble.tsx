"use client";

import { useState } from "react";
import { MessageCircle, X, Send, Bot, User, Sparkles } from "lucide-react";

interface DemoChatBubbleProps {
  primaryColor: string;
  welcomeMessage: string;
  businessName: string;
}

function getOrCreateWebchatSessionId(): string {
  if (typeof window === "undefined") return "";
  const storageKey = "tropigo_webchat_session";
  let sessionId = window.localStorage.getItem(storageKey);
  if (!sessionId) {
    sessionId = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `web_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    window.localStorage.setItem(storageKey, sessionId);
  }
  return sessionId;
}

export function DemoChatBubble({
  primaryColor,
  welcomeMessage,
  businessName,
}: DemoChatBubbleProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ sender: "assistant" | "customer"; content: string }>>([
    { sender: "assistant", content: welcomeMessage },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState<string>(getOrCreateWebchatSessionId);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input;
    setInput("");
    const newMsgs = [...messages, { sender: "customer" as const, content: userText }];
    setMessages(newMsgs);
    setLoading(true);

    try {
      const res = await fetch("/api/webchat/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          sessionId,
          history: newMsgs.map((m) => ({
            role: m.sender === "customer" ? "user" : "assistant",
            content: m.content,
          })),
        }),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          sender: "assistant",
          content: data.reply || "He recibido tu mensaje. ¿En qué más puedo ayudarte?",
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: "assistant", content: "Disculpa, ha ocurrido un error temporal de conexión." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Ventana de Chat */}
      {open && (
        <div className="bg-white rounded-3xl shadow-2xl border border-[#EAECF0] w-88 sm:w-96 h-[480px] mb-4 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div
            style={{ backgroundColor: primaryColor }}
            className="p-4 text-white flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
                L
              </div>
              <div>
                <h3 className="font-bold text-xs">{businessName}</h3>
                <p className="text-[10px] text-white/80 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  <span>Asistente virtual activo</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="p-1 hover:bg-white/10 rounded-full transition-colors text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mensajes */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#F9FAFB] text-xs">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex gap-2 max-w-[85%] ${
                  m.sender === "customer" ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                <div
                  className={`p-3 rounded-2xl whitespace-pre-wrap leading-relaxed shadow-2xs ${
                    m.sender === "customer"
                      ? "text-white rounded-tr-none"
                      : "bg-white text-[#101828] border border-[#EAECF0] rounded-tl-none"
                  }`}
                  style={m.sender === "customer" ? { backgroundColor: primaryColor } : {}}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-[#667085] bg-white border border-[#EAECF0] p-2 rounded-xl w-fit">
                <span className="w-2 h-2 rounded-full bg-teal-600 animate-ping" />
                <span>Escribiendo...</span>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 border-t border-[#EAECF0] bg-white flex items-center gap-2 text-xs"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu consulta o pide cita..."
              className="flex-1 bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828] focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{ backgroundColor: primaryColor }}
              className="text-white p-2 rounded-xl transition-opacity disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Botón Flotante */}
      <button
        id="atiende-chat-trigger"
        onClick={() => setOpen(!open)}
        style={{ backgroundColor: primaryColor }}
        className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-105 transition-transform"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  );
}
