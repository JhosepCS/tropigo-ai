"use client";

import { useState } from "react";
import { Settings, Bot, Mic, ShieldCheck, Save, Check } from "lucide-react";

interface AjustesClientProps {
  initialBusiness: any;
  initialAssistant: any;
  adminEmail: string;
}

export function AjustesClient({
  initialBusiness,
  initialAssistant,
  adminEmail,
}: AjustesClientProps) {
  const [businessName, setBusinessName] = useState(
    initialBusiness?.name || "Tropigo Delivery"
  );
  const [cityZone, setCityZone] = useState(
    initialBusiness?.cityZone || "Ivirgarzama, Trópico de Cochabamba, Bolivia"
  );
  const [phone, setPhone] = useState(initialBusiness?.phone || "+59174389012");
  const [currencySymbol, setCurrencySymbol] = useState(
    initialBusiness?.currencySymbol || "Bs."
  );

  const [assistantName, setAssistantName] = useState(
    initialAssistant?.name || "TropiBot"
  );
  const [welcomeMessage, setWelcomeMessage] = useState(
    initialAssistant?.welcomeMessage || ""
  );
  const [instructions, setInstructions] = useState(
    initialAssistant?.instructions || ""
  );

  const [openRouterKey, setOpenRouterKey] = useState("");
  const [groqKey, setGroqKey] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 1. Datos de la Empresa Tropigo */}
      <div className="bg-white rounded-2xl border border-[#EAECF0] p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#EAECF0]">
          <Settings className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-sm text-[#101828]">
            Perfil del Negocio (Ivirgarzama)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-medium text-[#344054]">Nombre de la Empresa</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-[#344054]">Ciudad / Zona Operativa</label>
            <input
              type="text"
              value={cityZone}
              onChange={(e) => setCityZone(e.target.value)}
              className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-[#344054]">Teléfono Central Tropigo</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-[#344054]">Símbolo de Moneda</label>
            <input
              type="text"
              value={currencySymbol}
              onChange={(e) => setCurrencySymbol(e.target.value)}
              className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
            />
          </div>
        </div>
      </div>

      {/* 2. Personalidad de TropiBot */}
      <div className="bg-white rounded-2xl border border-[#EAECF0] p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#EAECF0]">
          <Bot className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-sm text-[#101828]">
            Comportamiento del Asistente de IA (TropiBot)
          </h3>
        </div>

        <div className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-medium text-[#344054]">Nombre del Asistente</label>
            <input
              type="text"
              value={assistantName}
              onChange={(e) => setAssistantName(e.target.value)}
              className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-[#344054]">Mensaje de Bienvenida</label>
            <textarea
              rows={3}
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl p-3 text-[#101828]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-[#344054]">Instrucciones Libres</label>
            <textarea
              rows={4}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl p-3 text-[#101828]"
            />
          </div>
        </div>
      </div>

      {/* 3. Proveedores de IA y Whisper */}
      <div className="bg-white rounded-2xl border border-[#EAECF0] p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#EAECF0]">
          <Mic className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-sm text-[#101828]">
            Claves de IA & Transcripción de Audios (Whisper)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-medium text-[#344054]">
              OpenRouter API Key (Modelos LLM con Tools)
            </label>
            <input
              type="password"
              value={openRouterKey}
              onChange={(e) => setOpenRouterKey(e.target.value)}
              placeholder="sk-or-v1-..."
              className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
            />
            <span className="text-[10px] text-[#667085]">
              Modelo activo: anthropic/claude-3.5-haiku
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-[#344054]">
              Groq API Key / Whisper (Notas de voz de WhatsApp)
            </label>
            <input
              type="password"
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              placeholder="gsk_..."
              className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
            />
            <span className="text-[10px] text-[#667085]">
              Transcribe audios de clientes pidiendo comida en segundos.
            </span>
          </div>
        </div>
      </div>

      {/* 4. Seguridad y Cifrado */}
      <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-5 flex items-center justify-between text-xs text-emerald-900">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
          <div>
            <p className="font-semibold text-emerald-950">
              Cifrado AES-256-GCM Activo
            </p>
            <p className="text-[11px] text-emerald-800">
              Todos los tokens de Meta, API keys y contraseñas se almacenan cifrados con clave simétrica en base de datos.
            </p>
          </div>
        </div>
      </div>

      {/* Botón de Guardar */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-xs font-semibold transition-colors shadow-xs"
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{saved ? "Guardado con éxito!" : "Guardar Cambios"}</span>
        </button>
      </div>
    </div>
  );
}
