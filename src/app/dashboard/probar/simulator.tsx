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
  Calendar,
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
        "¡Hola! 👋 Soy el asistente virtual de Clínica Dental Lumen en Madrid. ¿En qué puedo ayudarte hoy? Puedo informarte sobre nuestros tratamientos, tarifas o agendar tu cita en Google Calendar.",
    },
  ]);
  const [input, setInput] = useState("");
  const [safeMode, setSafeMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [timelineSteps, setTimelineSteps] = useState<any[]>([]);

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

      const data = await res.json();
      setMessages([
        ...newMsgs,
        {
          role: "assistant",
          content: data.content,
          toolCalls: data.toolCalls,
        },
      ]);

      if (data.toolCalls?.length > 0) {
        setTimelineSteps((prev) => [
          ...prev,
          ...data.toolCalls.map((tc: any) => ({
            ...tc,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          })),
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        role: "assistant",
        content:
          "¡Hola! 👋 Soy el asistente virtual de Clínica Dental Lumen en Madrid. ¿En qué puedo ayudarte hoy?",
      },
    ]);
    setTimelineSteps([]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[740px]">
      {/* Columna Izquierda: Chat como si fuera un cliente */}
      <div className="lg:col-span-6 bg-white rounded-2xl border border-[#EAECF0] shadow-2xs flex flex-col overflow-hidden">
        {/* Cabecera del Chat */}
        <div className="px-5 py-3.5 border-b border-[#EAECF0] flex items-center justify-between bg-[#FAFAFA]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-teal-700 flex items-center justify-center text-white font-bold text-sm">
              L
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-[#101828]">LumenBot</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded-full">
                  En línea
                </span>
              </div>
              <p className="text-xs text-[#667085]">Clínica Dental Lumen • Gran Vía, Madrid</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Interruptor Modo Seguro */}
            <button
              onClick={() => setSafeMode(!safeMode)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors font-medium ${
                safeMode
                  ? "bg-purple-50 text-purple-700 border-purple-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {safeMode ? <Shield className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
              <span>Modo seguro: {safeMode ? "Activo" : "Apagado"}</span>
            </button>

            {/* Botón Nueva Conversación */}
            <button
              onClick={handleReset}
              title="Empezar una conversación nueva"
              className="p-1.5 text-[#667085] hover:text-[#101828] hover:bg-[#F2F4F7] rounded-xl transition-colors border border-[#EAECF0]"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mensajes del Chat */}
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
                  m.role === "user" ? "bg-[#101828] text-white" : "bg-teal-700 text-white"
                }`}
              >
                {m.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              <div className="space-y-1">
                <div
                  className={`p-3.5 rounded-2xl text-xs whitespace-pre-wrap leading-relaxed shadow-2xs ${
                    m.role === "user"
                      ? "bg-teal-700 text-white rounded-tr-none"
                      : "bg-white text-[#101828] border border-[#EAECF0] rounded-tl-none"
                  }`}
                >
                  {m.content}
                </div>

                {m.toolCalls && m.toolCalls.length > 0 && (
                  <div className="flex items-center gap-1 text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 w-fit">
                    <Sparkles className="w-3 h-3 text-purple-600" />
                    <span>Llamó a {m.toolCalls.length} herramienta(s)</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-[#667085] bg-white border border-[#EAECF0] p-2.5 rounded-xl w-fit">
              <span className="w-2 h-2 rounded-full bg-teal-600 animate-ping" />
              <span>Consultando Google Calendar y respondiendo...</span>
            </div>
          )}
        </div>

        {/* Chips de Preguntas Rápidas para Demostración */}
        <div className="px-4 py-2 border-t border-[#EAECF0] bg-white flex items-center gap-2 overflow-x-auto text-[11px]">
          <span className="text-[#667085] shrink-0 font-medium">Ejemplos:</span>
          {[
            "¿Cuánto cuesta el Invisalign?",
            "¿Tenéis hueco el jueves por la tarde?",
            "Confírmame a las 17:30 con la Dra. Gómez",
            "Tengo un dolor muy fuerte de muela",
          ].map((chip) => (
            <button
              key={chip}
              onClick={() => handleSend(chip)}
              className="bg-[#F2F4F7] hover:bg-[#E4E7EC] text-[#344054] px-2.5 py-1 rounded-lg shrink-0 transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input */}
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
              placeholder="Escribe como cliente (ej: 'Hola, ¿qué horario tenéis y cuánto cuesta la limpieza?')..."
              className="flex-1 bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-4 py-2.5 text-xs text-[#101828] focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-teal-700 hover:bg-teal-800 disabled:bg-[#D0D5DD] text-white p-2.5 rounded-xl transition-colors shrink-0 shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Columna Derecha: Línea de Tiempo con Cada Paso (Para vídeo) */}
      <div className="lg:col-span-6 bg-white rounded-2xl border border-[#EAECF0] shadow-2xs flex flex-col overflow-hidden">
        <div className="p-4 border-b border-[#EAECF0] bg-[#FAFAFA] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-600" />
            <h3 className="font-bold text-xs text-[#101828]">
              Línea de Tiempo de Herramientas (AI Tool Calling)
            </h3>
          </div>
          <span className="text-[11px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-semibold">
            {timelineSteps.length} paso(s) ejecutado(s)
          </span>
        </div>

        <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-[#F9FAFB]">
          {timelineSteps.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-xs text-[#667085] space-y-2">
              <Calendar className="w-10 h-10 text-[#D0D5DD]" />
              <p className="font-semibold text-[#344054]">Esperando llamadas a herramientas...</p>
              <p className="text-[11px] max-w-xs text-[#98A2B3]">
                Cuando preguntes por citas, Google Calendar, servicios o urgencias, aquí se mostrará cada paso con sus parámetros y respuesta en tiempo real.
              </p>
            </div>
          ) : (
            timelineSteps.map((step, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-[#EAECF0] p-4 space-y-3 shadow-2xs hover:border-[#D0D5DD] transition-all"
              >
                {/* Cabecera del Paso */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-mono font-bold text-xs text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-200">
                      {step.tool}()
                    </span>
                  </div>
                  <span className="text-[11px] text-[#98A2B3] font-mono">
                    {step.timestamp}
                  </span>
                </div>

                {/* Parámetros enviados */}
                <div>
                  <p className="text-[10px] font-bold text-[#667085] uppercase tracking-wider mb-1">
                    Parámetros enviados por la IA:
                  </p>
                  <pre className="bg-[#F8F9FA] p-2.5 rounded-xl text-[11px] text-[#344054] font-mono overflow-x-auto border border-[#EAECF0]">
                    {JSON.stringify(step.args, null, 2)}
                  </pre>
                </div>

                {/* Resultado retornado */}
                <div>
                  <p className="text-[10px] font-bold text-[#667085] uppercase tracking-wider mb-1">
                    Respuesta de la integración:
                  </p>
                  <pre className="bg-[#101828] text-[#E4E7EC] p-2.5 rounded-xl text-[11px] font-mono overflow-x-auto">
                    {JSON.stringify(step.result, null, 2)}
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
