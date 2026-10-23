"use client";

import { useState } from "react";
import {
  Send,
  MapPin,
  Mic,
  RotateCcw,
  Shield,
  ShieldAlert,
  Bot,
  User,
  CheckCircle2,
  Cpu,
  Sparkles,
  ShoppingBag,
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  toolCalls?: any[];
}

export function Simulator() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "¡Hola! 👋 Te habla TropiBot, el asistente de pedidos de Tropigo Delivery en Ivirgarzama. 🛵💨\n\n¿Qué se te antoja pedir hoy? Tenemos pollos broaster, hamburguesas, comida del trópico, farmacia o servicio de mandados.",
    },
  ]);
  const [input, setInput] = useState("");
  const [safeMode, setSafeMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [allToolCalls, setAllToolCalls] = useState<any[]>([]);

  const handleSend = async (customText?: string) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: textToSend }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          safeMode,
        }),
      });

      const data = await res.json();
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: data.content,
          toolCalls: data.toolCalls,
        },
      ]);

      if (data.toolCalls?.length > 0) {
        setAllToolCalls((prev) => [...prev, ...data.toolCalls]);
      }
    } catch (e) {
      console.error("Error al enviar mensaje:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMockLocation = () => {
    handleSend("📍 [Ubicación GPS compartida: Mercado Central de Ivirgarzama, lat: -17.0321, lng: -64.8564]");
  };

  const handleSendMockAudio = () => {
    handleSend("🎤 [Nota de voz transcrita: 'Hola buenas noches, por favor mándame 2 cuartos de pollo broaster con chaufa a la Av. Mortensen frente a Banco Unión']");
  };

  const handleReset = () => {
    setMessages([
      {
        role: "assistant",
        content:
          "¡Hola! 👋 Te habla TropiBot de Tropigo Delivery en Ivirgarzama. 🛵💨 ¿Qué se te antoja pedir hoy?",
      },
    ]);
    setAllToolCalls([]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[720px]">
      {/* Columna Izquierda: Chat Interactivo */}
      <div className="lg:col-span-7 bg-white rounded-2xl border border-[#EAECF0] shadow-xs flex flex-col overflow-hidden">
        {/* Cabecera del Chat */}
        <div className="px-5 py-3.5 border-b border-[#EAECF0] flex items-center justify-between bg-[#FAFAFA]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
              TB
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-[#101828]">TropiBot</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded-full">
                  En línea
                </span>
              </div>
              <p className="text-xs text-[#667085]">WhatsApp Simulator (+591 74389012)</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Modo Seguro Switch */}
            <button
              onClick={() => setSafeMode(!safeMode)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                safeMode
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {safeMode ? <Shield className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
              <span>Modo Seguro: {safeMode ? "Activo" : "Desactivado"}</span>
            </button>

            <button
              onClick={handleReset}
              title="Nueva Conversación"
              className="p-1.5 text-[#667085] hover:text-[#101828] hover:bg-[#F2F4F7] rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Lista de Mensajes */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-[#F9FAFB]">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-3 max-w-[85%] ${
                m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs ${
                  m.role === "user"
                    ? "bg-[#101828] text-white"
                    : "bg-emerald-600 text-white"
                }`}
              >
                {m.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              <div className="space-y-1">
                <div
                  className={`p-3.5 rounded-2xl text-xs whitespace-pre-wrap leading-relaxed shadow-xs ${
                    m.role === "user"
                      ? "bg-emerald-700 text-white rounded-tr-none"
                      : "bg-white text-[#101828] border border-[#EAECF0] rounded-tl-none"
                  }`}
                >
                  {m.content}
                </div>

                {m.toolCalls && m.toolCalls.length > 0 && (
                  <div className="flex items-center gap-1 text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 w-fit">
                    <Sparkles className="w-3 h-3 text-purple-600" />
                    <span>Usó {m.toolCalls.length} herramienta(s)</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-[#667085] bg-white border border-[#EAECF0] p-2.5 rounded-xl w-fit">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>TropiBot está escribiendo y calculando...</span>
            </div>
          )}
        </div>

        {/* Barra de Acciones Rápidas (GPS / Audio simulado) */}
        <div className="px-4 py-2 border-t border-[#EAECF0] bg-white flex items-center gap-2 text-xs">
          <span className="text-[#667085] text-[11px] font-medium">Simular entrada:</span>
          <button
            onClick={handleSendMockLocation}
            className="flex items-center gap-1 bg-red-50 text-red-700 hover:bg-red-100 px-2.5 py-1 rounded-md border border-red-200 transition-colors"
          >
            <MapPin className="w-3 h-3" />
            <span>Pin GPS Ivirgarzama</span>
          </button>
          <button
            onClick={handleSendMockAudio}
            className="flex items-center gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100 px-2.5 py-1 rounded-md border border-blue-200 transition-colors"
          >
            <Mic className="w-3 h-3" />
            <span>Nota de voz pidiendo comida</span>
          </button>
        </div>

        {/* Input de Texto */}
        <div className="p-3 border-t border-[#EAECF0] bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe como cliente (ej: 'Quiero 1 pollo broaster y una coca cola')..."
              className="flex-1 bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-4 py-2.5 text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-[#D0D5DD] text-white p-2.5 rounded-xl transition-colors shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Columna Derecha: Línea de Tiempo de Herramientas & Carrito JSON */}
      <div className="lg:col-span-5 bg-white rounded-2xl border border-[#EAECF0] shadow-xs flex flex-col overflow-hidden">
        <div className="p-4 border-b border-[#EAECF0] bg-[#FAFAFA] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-600" />
            <h3 className="font-semibold text-xs text-[#101828]">
              Línea de Tiempo de Herramientas (AI Execution)
            </h3>
          </div>
          <span className="text-[11px] bg-[#F2F4F7] text-[#475467] px-2 py-0.5 rounded-full border border-[#EAECF0]">
            {allToolCalls.length} ejecuciones
          </span>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#F9FAFB]">
          {allToolCalls.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-xs text-[#667085] space-y-2">
              <ShoppingBag className="w-8 h-8 text-[#D0D5DD]" />
              <p className="font-medium text-[#344054]">Sin herramientas invocadas aún</p>
              <p className="text-[11px] max-w-xs text-[#98A2B3]">
                Cuando el cliente pida el menú, envíe su ubicación o confirme un pedido, aquí verás cada función ejecutada con sus parámetros y respuesta JSON.
              </p>
            </div>
          ) : (
            allToolCalls.map((tc, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-[#EAECF0] p-3.5 space-y-2 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                    {tc.tool}()
                  </span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> OK
                  </span>
                </div>

                <div>
                  <p className="text-[10px] font-semibold text-[#667085] uppercase tracking-wider mb-1">
                    Parámetros de entrada:
                  </p>
                  <pre className="bg-[#F8F9FA] p-2 rounded-lg text-[10px] text-[#344054] font-mono overflow-x-auto border border-[#EAECF0]">
                    {JSON.stringify(tc.args, null, 2)}
                  </pre>
                </div>

                <div>
                  <p className="text-[10px] font-semibold text-[#667085] uppercase tracking-wider mb-1">
                    Resultado retornado al LLM:
                  </p>
                  <pre className="bg-[#101828] text-[#E4E7EC] p-2 rounded-lg text-[10px] font-mono overflow-x-auto">
                    {JSON.stringify(tc.result, null, 2)}
                  </pre>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
