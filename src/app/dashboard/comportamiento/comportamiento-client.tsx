"use client";

import { useState } from "react";
import {
  Sparkles,
  Eye,
  Check,
  Save,
  Clock,
  UserCheck,
  ShieldAlert,
  X,
  Copy,
} from "lucide-react";

interface ComportamientoClientProps {
  initialAssistant: any;
  business: any;
  services: any[];
  faqs: any[];
  knowledgeBaseText: string;
}

export function ComportamientoClient({
  initialAssistant,
  business,
  services,
  faqs,
  knowledgeBaseText,
}: ComportamientoClientProps) {
  const [name, setName] = useState(initialAssistant?.name || "LumenBot");
  const [avatarUrl, setAvatarUrl] = useState(initialAssistant?.avatarUrl || "/avatar.png");
  const [tone, setTone] = useState(initialAssistant?.tone || "cercano");
  const [welcomeMessage, setWelcomeMessage] = useState(
    initialAssistant?.welcomeMessage || ""
  );
  const [instructions, setInstructions] = useState(
    initialAssistant?.instructions || ""
  );
  const [prohibitedActions, setProhibitedActions] = useState(
    initialAssistant?.prohibitedActions || ""
  );
  const [offHoursPolicy, setOffHoursPolicy] = useState(
    initialAssistant?.offHoursPolicy || "TAKE_MESSAGE"
  );
  const [handoffRules, setHandoffRules] = useState<string[]>(() => {
    try {
      return JSON.parse(initialAssistant?.handoffRules || "[]");
    } catch (e) {
      return ["queja", "urgencia", "pide hablar con alguien", "no sabe la respuesta"];
    }
  });
  const [customHandoffRule, setCustomHandoffRule] = useState(
    initialAssistant?.customHandoffRule || ""
  );

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Compilar el prompt del sistema real que recibe el modelo
  const fullSystemPrompt = `Eres ${name}, el asistente virtual de inteligencia artificial de «${business?.name || "Clínica Dental Lumen"}».
Ubicación: ${business?.address || "Calle Gran Vía 42, 2º Izquierda, 28013 Madrid"}.
Teléfono de contacto: ${business?.phone || "+34 912 345 678"}.
Sitio web: ${business?.website || "https://clinicalumen.es"}.
Zona horaria: ${business?.timezone || "Europe/Madrid"}.
Fecha y hora actual: ${new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}.

TONO Y PERSONALIDAD:
- Tono: ${tone.toUpperCase()}. Responde siempre en español de España de forma natural, educada, concisa y empática (estilo WhatsApp).
- ${instructions}

LO QUE NUNCA DEBES HACER (REGLAS ESTRICTAS):
- ${prohibitedActions.split("\n").join("\n- ")}

HORARIO DE ATENCIÓN:
- Lunes a Viernes: 09:00 a 14:00 y 16:00 a 20:00.
- Sábados y Domingos: Cerrado.
- Política fuera de horario: ${
    offHoursPolicy === "CONTINUE_AND_BOOK"
      ? "Seguir atendiendo dudas y dar cita en los huecos disponibles."
      : "Tomar el recado con nombre y teléfono indicando que el equipo le contactará a primera hora de apertura."
  }

CUÁNDO DERIVAR A UNA PERSONA DEL EQUIPO (PASAR A HUMANO):
${handoffRules.map((r) => `- Cuando el cliente manifieste: ${r}`).join("\n")}
${customHandoffRule ? `- Regla adicional: ${customHandoffRule}` : ""}

CATÁLOGO DE SERVICIOS Y PRECIOS:
${services
  .map(
    (s) =>
      `- ${s.name}: ${s.durationMinutes} min, ${
        s.price === 0 ? "Gratuito" : `${s.priceType === "from" ? "Desde " : ""}${s.price} €`
      } ${s.requiresAssessment ? "(Requiere valoración previa)" : ""} — ${s.description}`
  )
  .join("\n")}

PREGUNTAS FRECUENTES DEL NEGOCIO:
${faqs.map((f) => `P: ${f.question}\nR: ${f.answer}`).join("\n\n")}

CONOCIMIENTO ADICIONAL DE LA CLÍNICA:
${knowledgeBaseText}

REGLAS DE ACTUACIÓN CON CITAS:
1. En el primer mensaje preséntate amablemente como asistente virtual del negocio.
2. Antes de crear, modificar o cancelar una cita en Google Calendar, confirma explícitamente con el paciente el día, la hora y el tratamiento seleccionado.
3. Si el paciente no puede acudir, recuérdale con amabilidad la política de avisar con 24h de antelación.`;

  const toggleHandoffRule = (rule: string) => {
    if (handoffRules.includes(rule)) {
      setHandoffRules(handoffRules.filter((r) => r !== rule));
    } else {
      setHandoffRules([...handoffRules, rule]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/settings/assistant-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          avatarUrl,
          tone,
          welcomeMessage,
          instructions,
          prohibitedActions,
          offHoursPolicy,
          handoffRules: JSON.stringify(handoffRules),
          customHandoffRule,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(fullSystemPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 1. Identidad del Asistente */}
      <div className="bg-white rounded-2xl border border-[#EAECF0] p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#EAECF0]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-600" />
            <h3 className="font-semibold text-sm text-[#101828]">Identidad y Tono</h3>
          </div>

          {/* Botón Ver el prompt completo */}
          <button
            onClick={() => setShowPromptModal(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-1.5 rounded-xl transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Ver el prompt completo</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-medium text-[#344054]">Nombre del Asistente</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828] focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-[#344054]">Tono de Comunicación</label>
            <div className="flex bg-[#F2F4F7] p-1 rounded-xl border border-[#EAECF0]">
              {(["cercano", "profesional", "directo"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTone(t)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                    tone === t
                      ? "bg-white text-[#101828] shadow-xs"
                      : "text-[#667085] hover:text-[#101828]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1.5 text-xs">
          <label className="font-medium text-[#344054]">Mensaje de Bienvenida</label>
          <textarea
            rows={3}
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl p-3 text-[#101828] focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* 2. Instrucciones y Límites */}
      <div className="bg-white rounded-2xl border border-[#EAECF0] p-6 shadow-2xs space-y-4 text-xs">
        <h3 className="font-semibold text-sm text-[#101828] pb-3 border-b border-[#EAECF0]">
          Instrucciones y Cosas Prohibidas
        </h3>

        <div className="space-y-1.5">
          <label className="font-medium text-[#344054]">Instrucciones en texto libre</label>
          <textarea
            rows={4}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl p-3 text-[#101828] focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="font-medium text-[#344054]">Lista de cosas que NUNCA debe hacer</label>
          <textarea
            rows={4}
            value={prohibitedActions}
            onChange={(e) => setProhibitedActions(e.target.value)}
            className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl p-3 text-[#101828] focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* 3. Horarios y Política Fuera de Horario */}
      <div className="bg-white rounded-2xl border border-[#EAECF0] p-6 shadow-2xs space-y-4 text-xs">
        <div className="flex items-center gap-2 pb-3 border-b border-[#EAECF0]">
          <Clock className="w-5 h-5 text-teal-600" />
          <h3 className="font-semibold text-sm text-[#101828]">Horario de Atención</h3>
        </div>

        <div className="p-4 bg-[#F9FAFB] rounded-xl border border-[#EAECF0] space-y-2 text-[#475467]">
          <div className="flex justify-between font-medium">
            <span>Lunes a Viernes:</span>
            <span className="text-[#101828] font-bold">09:00 a 14:00 y 16:00 a 20:00</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Sábados y Domingos:</span>
            <span className="text-amber-700 font-semibold">Cerrado</span>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <label className="font-medium text-[#344054]">¿Qué contesta el asistente fuera de horario?</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="radio"
                name="offHours"
                value="TAKE_MESSAGE"
                checked={offHoursPolicy === "TAKE_MESSAGE"}
                onChange={() => setOffHoursPolicy("TAKE_MESSAGE")}
                className="text-teal-600 focus:ring-teal-500"
              />
              <span>Tomar el recado y avisar que el equipo contactará al abrir</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="radio"
                name="offHours"
                value="CONTINUE_AND_BOOK"
                checked={offHoursPolicy === "CONTINUE_AND_BOOK"}
                onChange={() => setOffHoursPolicy("CONTINUE_AND_BOOK")}
                className="text-teal-600 focus:ring-teal-500"
              />
              <span>Seguir atendiendo dudas y dar cita en los huecos disponibles</span>
            </label>
          </div>
        </div>
      </div>

      {/* 4. Reglas de Pase a una Persona */}
      <div className="bg-white rounded-2xl border border-[#EAECF0] p-6 shadow-2xs space-y-4 text-xs">
        <div className="flex items-center gap-2 pb-3 border-b border-[#EAECF0]">
          <UserCheck className="w-5 h-5 text-teal-600" />
          <h3 className="font-semibold text-sm text-[#101828]">Cuándo pasar a una persona</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { id: "queja", label: "Queja o disconformidad del paciente" },
            { id: "urgencia", label: "Urgencia o dolor dental severo" },
            { id: "pide hablar con alguien", label: "Pide explícitamente hablar con una persona" },
            { id: "no sabe la respuesta", label: "El asistente no sabe responder la duda" },
          ].map((item) => (
            <label
              key={item.id}
              className="flex items-center gap-2.5 p-3 rounded-xl border border-[#EAECF0] hover:bg-[#F9FAFB] cursor-pointer"
            >
              <input
                type="checkbox"
                checked={handoffRules.includes(item.id)}
                onChange={() => toggleHandoffRule(item.id)}
                className="rounded text-teal-600 focus:ring-teal-500"
              />
              <span className="font-medium text-[#344054]">{item.label}</span>
            </label>
          ))}
        </div>

        <div className="space-y-1.5 pt-2">
          <label className="font-medium text-[#344054]">Regla libre adicional:</label>
          <input
            type="text"
            value={customHandoffRule}
            onChange={(e) => setCustomHandoffRule(e.target.value)}
            placeholder="Ej: Presupuestos combinados de ortodoncia e implantes..."
            className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
          />
        </div>
      </div>

      {/* Botón Guardar Cambios */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{saved ? "Guardado con éxito!" : "Guardar Comportamiento"}</span>
        </button>
      </div>

      {/* Modal: Ver el prompt completo (Sólo lectura) */}
      {showPromptModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-[#EAECF0] space-y-4 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAECF0]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-sm text-[#101828]">Prompt Completo del Asistente (Solo lectura)</h3>
              </div>
              <button
                onClick={() => setShowPromptModal(false)}
                className="p-1 text-[#667085] hover:text-[#101828] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#667085]">
              Este es el texto exacto compilado que se envía como instrucción de sistema (system prompt) a OpenRouter en cada llamada.
            </p>

            <pre className="flex-1 bg-[#101828] text-[#E4E7EC] p-4 rounded-xl text-[11px] font-mono overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {fullSystemPrompt}
            </pre>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={handleCopyPrompt}
                className="flex items-center gap-1.5 text-xs text-[#344054] hover:text-[#101828] border border-[#D0D5DD] px-3 py-1.5 rounded-lg"
              >
                {copiedPrompt ? <Check className="w-3.5 h-3.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPrompt ? "Copiado al portapapeles" : "Copiar prompt"}</span>
              </button>

              <button
                onClick={() => setShowPromptModal(false)}
                className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-xl text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
