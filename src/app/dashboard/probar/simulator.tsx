"use client";

import { useState } from "react";
import {
  Send,
  RotateCcw,
  Shield,
  ShieldAlert,
  Bot,
  User,
  CheckCircle2,
  Cpu,
  Sparkles,
  ShoppingBag,
  Bike,
  Navigation,
  Clock,
  ArrowRight,
  Database,
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
        "¡Hola! 👋 Te habla TropiBot, tu asistente de TropiGO en Ivirgarzama. ¿Qué se te antoja pedir hoy? Tenemos delivery de los mejores restaurantes, farmacia, mandados express y mototaxis.",
    },
  ]);
  const [input, setInput] = useState("");
  const [safeMode, setSafeMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timelineSteps, setTimelineSteps] = useState<any[]>([
    {
      title: "Asistente Inicializado",
      tool: "identidad",
      status: "ready",
      details: "TropiBot (Groq / GPT-OSS 120B) listo para Ivirgarzama (Trópico de Cochabamba).",
      time: "Ahora",
    },
  ]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const newMsgs: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMsgs.map((m) => ({ role: m.role, content: m.content })),
          safeMode,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo conectar con TropiBot.");
      }

      // La API devuelve { success, result: { content, toolCalls, ... } }.
      // Se acepta también el formato plano por compatibilidad.
      const result = data.result || data;
      const toolCalls = result.toolCalls || data.toolCalls;

      setMessages([
        ...newMsgs,
        {
          role: "assistant",
          content: result.content || "Mensaje procesado.",
          toolCalls,
        },
      ]);

      // Agregar a la línea de tiempo de ejecución
      if (toolCalls && toolCalls.length > 0) {
        const newSteps = toolCalls.map((tc: any) => ({
          title: `Herramienta: ${tc.tool}`,
          tool: tc.tool,
          status: "success",
          details: JSON.stringify(tc.args, null, 2),
          result: JSON.stringify(tc.result, null, 2),
          time: new Date().toLocaleTimeString("es-BO"),
        }));
        setTimelineSteps((prev) => [...newSteps, ...prev]);
      } else {
        setTimelineSteps((prev) => [
          {
            title: "Respuesta Generada Directa",
            tool: "groq_chat",
            status: "direct",
            details: "Respuesta de conversación general de TropiGO.",
            time: new Date().toLocaleTimeString("es-BO"),
          },
          ...prev,
        ]);
      }
    } catch (e: any) {
      console.error(e);
      setMessages([
        ...newMsgs,
        {
          role: "assistant",
          content:
            e?.message === "No estás autenticado en TropiGO"
              ? "Tu sesión expiró. Vuelve a iniciar sesión para usar el simulador."
              : e?.message || "Hubo un error al conectar con TropiBot.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        role: "assistant",
        content:
          "¡Hola! 👋 Te habla TropiBot, tu asistente de TropiGO en Ivirgarzama. ¿Qué se te antoja pedir hoy? Tenemos delivery de comida de los mejores restaurantes, farmacia, mandados y mototaxis.",
      },
    ]);
    setTimelineSteps([
      {
        title: "Conversación Reiniciada",
        tool: "reset",
        status: "ready",
        details: "Memoria del chat reseteada a estado inicial.",
        time: new Date().toLocaleTimeString("es-BO"),
      },
    ]);
  };

  const quickChips = [
    "¿Qué platos tienen en Pollería El Pahuichi?",
    "¿Cuánto cuesta el envío urbano en Ivirgarzama?",
    "Quiero 2 cuartos de pollo broaster a Av. Mortensen",
    "Necesito una mototaxi del Mercado Central a la Terminal",
    "Tengo una queja con mi pedido, pásame con alguien",
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Columna Izquierda: Chat Interactivo */}
      <div className="lg:col-span-7 bg-white rounded-2xl border border-[#EAECF0] shadow-xs flex flex-col h-[650px] overflow-hidden">
        {/* Cabecera Chat */}
        <div className="p-4 border-b border-[#EAECF0] flex items-center justify-between bg-[#FAFAFA]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-2xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm text-[#101828]">
                  TropiBot Simulator
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full">
                  Groq GPT-OSS
                </span>
              </div>
              <p className="text-[11px] text-[#667085]">
                Simula clientes de Ivirgarzama por WhatsApp y Web
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Switch Modo Seguro */}
            <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-xl border border-[#EAECF0] shadow-2xs">
              <span className="text-[11px] font-semibold text-[#344054]">
                Modo Seguro
              </span>
              <button
                type="button"
                onClick={() => setSafeMode(!safeMode)}
                className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                  safeMode ? "bg-emerald-600" : "bg-gray-300"
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    safeMode ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <button
              onClick={handleReset}
              title="Reiniciar chat"
              className="p-1.5 text-[#667085] hover:text-[#101828] hover:bg-[#F2F4F7] rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mensajes */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((m, idx) => {
            const isBot = m.role === "assistant";

            return (
              <div
                key={idx}
                className={`flex gap-2.5 ${isBot ? "justify-start" : "justify-end"}`}
              >
                {isBot && (
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    TG
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-2xs ${
                    isBot
                      ? "bg-[#F9FAFB] border border-[#EAECF0] text-[#101828]"
                      : "bg-emerald-600 text-white font-medium"
                  }`}
                >
                  <p className="whitespace-pre-line">{m.content}</p>

                  {m.toolCalls && m.toolCalls.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-[#EAECF0] flex flex-wrap gap-1">
                      {m.toolCalls.map((tc: any, i: number) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 text-[10px] font-mono bg-white text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md"
                        >
                          <Cpu className="w-3 h-3 text-emerald-600" />
                          <span>{tc.tool}()</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-2 items-center text-xs text-[#667085] p-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
              <span>TropiBot está procesando con Groq...</span>
            </div>
          )}
        </div>

        {/* Chips de Pregunta Rápida */}
        <div className="p-2 border-t border-[#EAECF0] bg-[#FAFAFA] flex items-center gap-1.5 overflow-x-auto text-[11px]">
          <span className="text-[#98A2B3] shrink-0 px-1 font-bold">Pruebas:</span>
          {quickChips.map((chip, i) => (
            <button
              key={i}
              onClick={() => handleSend(chip)}
              className="shrink-0 bg-white border border-[#D0D5DD] hover:border-emerald-500 hover:text-emerald-700 text-[#475467] font-medium px-2.5 py-1 rounded-full transition-colors truncate max-w-[240px]"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 border-t border-[#EAECF0] flex gap-2 bg-white"
        >
          <input
            type="text"
            placeholder="Escribe como cliente de Ivirgarzama (ej: ¿tienen majadito hoy?)..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 px-3.5 py-2 text-xs bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <span>Enviar</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* Columna Derecha: Línea de Tiempo de Herramientas */}
      <div className="lg:col-span-5 bg-white rounded-2xl border border-[#EAECF0] p-5 shadow-xs h-[650px] flex flex-col">
        <div className="pb-3 border-b border-[#EAECF0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-600" />
            <h3 className="font-black text-sm text-[#101828]">
              Ejecución de Herramientas (Tools)
            </h3>
          </div>
          <span className="text-[10px] text-[#667085] bg-[#F2F4F7] px-2 py-0.5 rounded-full font-semibold">
            Timeline en Vivo
          </span>
        </div>

        <p className="text-[11px] text-[#667085] py-2">
          Inspecciona cada llamada a función que el modelo ejecuta contra la base de datos de TropiGO.
        </p>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 mt-2">
          {timelineSteps.map((step, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl border border-[#EAECF0] bg-[#F8F9FA] text-xs space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#101828] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  {step.title}
                </span>
                <span className="text-[10px] text-[#98A2B3] font-mono">{step.time}</span>
              </div>

              {step.details && (
                <div className="bg-white p-2 rounded-lg border border-[#EAECF0] font-mono text-[10px] text-[#344054] overflow-x-auto">
                  <pre>{step.details}</pre>
                </div>
              )}

              {step.result && (
                <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-200/50 font-mono text-[10px] text-emerald-900 overflow-x-auto">
                  <span className="text-[9px] font-bold uppercase tracking-wider block text-emerald-700 mb-0.5">
                    Resultado:
                  </span>
                  <pre>{step.result}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
