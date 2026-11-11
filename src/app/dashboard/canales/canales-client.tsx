"use client";

import { useState } from "react";
import {
  Globe,
  Copy,
  Check,
  ExternalLink,
  Code,
  Eye,
  MessageSquare,
} from "lucide-react";
import { WhatsAppMetaConnect } from "@/components/whatsapp-meta-connect";
import { WhatsAppBaileysQr } from "@/components/whatsapp-baileys-qr";
import { MaskedWhatsAppStatus } from "@/lib/whatsapp/meta-manager";

interface CanalesClientProps {
  initialWpChannel: any;
  initialWebChannel: any;
  businessName: string;
  initialWhatsAppStatus?: MaskedWhatsAppStatus;
}

export function CanalesClient({
  initialWpChannel,
  initialWebChannel,
  businessName,
  initialWhatsAppStatus,
}: CanalesClientProps) {
  // Web Chat Settings State
  const initialWebSettings = (() => {
    try {
      return JSON.parse(initialWebChannel?.settingsJson || "{}");
    } catch (e) {
      return {
        enabled: true,
        primaryColor: "#059669",
        welcomeMessage: "¡Hola! ¿Qué se te antoja pedir hoy en Ivirgarzama?",
      };
    }
  })();

  const [webChatEnabled, setWebChatEnabled] = useState(initialWebSettings.enabled ?? true);
  const [primaryColor, setPrimaryColor] = useState(initialWebSettings.primaryColor || "#059669");
  const [welcomeText, setWelcomeText] = useState(
    initialWebSettings.welcomeMessage || "¡Hola! ¿Qué se te antoja pedir hoy en Ivirgarzama?"
  );
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [savedWeb, setSavedWeb] = useState(false);

  const initialWpSettings = (() => {
    try {
      return JSON.parse(initialWpChannel?.settingsJson || "{}");
    } catch {
      return {};
    }
  })();

  const metaActive = initialWpSettings.provider === "META_CLOUD_API";

  const handleSaveWebSettings = async () => {
    try {
      await fetch("/api/channels/webchat/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: webChatEnabled,
          primaryColor,
          welcomeMessage: welcomeText,
        }),
      });
      setSavedWeb(true);
      setTimeout(() => setSavedWeb(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const embedSnippet = `<script src="${typeof window !== "undefined" ? window.location.origin : "https://tropigo.app"}/widget.js" data-business="${businessName}" data-color="${primaryColor}"></script>`;

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(embedSnippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* 1. Canal Oficial WhatsApp Business Platform (Cloud API de Meta) */}
      <WhatsAppMetaConnect initialStatus={initialWhatsAppStatus} />

      {/* 2. Modo QR de Baileys (solo pruebas, no oficial) */}
      <WhatsAppBaileysQr
        initialStatus={initialWpChannel?.status}
        initialQrCode={initialWpChannel?.qrCode}
        initialPhone={initialWpChannel?.phone}
        metaActive={metaActive}
      />

      {/* 3. Chat para tu Web */}
      <div className="bg-white rounded-3xl border border-[#EAECF0] p-6 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#EAECF0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl">
              <MessageSquare className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#101828]">Burbuja de Chat Web (Opcional)</h3>
              <p className="text-xs text-[#667085]">
                Widget web conectado al mismo motor de TropiGO AI para pruebas locales o inserción web.
              </p>
            </div>
          </div>

          <a
            href="/demo"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
          >
            <Eye className="w-3.5 h-3.5 text-emerald-700" />
            <span>Ver demo web (/demo)</span>
            <ExternalLink className="w-3 h-3 text-emerald-600 ml-0.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Configuración Visual */}
          <div className="lg:col-span-7 space-y-4 text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-[#EAECF0] bg-[#FAFAFA]">
              <div>
                <p className="font-semibold text-[#101828]">Burbuja de chat en la web</p>
                <p className="text-[11px] text-[#667085]">Activa o desactiva la visibilidad del widget</p>
              </div>
              <button
                type="button"
                onClick={() => setWebChatEnabled(!webChatEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  webChatEnabled ? "bg-emerald-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    webChatEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-[#344054]">Mensaje de bienvenida en web</label>
              <textarea
                rows={2}
                value={welcomeText}
                onChange={(e) => setWelcomeText(e.target.value)}
                className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl p-3 text-xs text-[#101828] focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSaveWebSettings}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl font-bold text-xs transition-colors shadow-2xs"
              >
                {savedWeb ? "Guardado!" : "Guardar Personalización Web"}
              </button>
            </div>
          </div>

          {/* Snippet de Inserción */}
          <div className="lg:col-span-5 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-3">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Code className="w-4 h-4 text-emerald-600" />
              <span>Código de Integración HTML</span>
            </div>
            <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] overflow-x-auto whitespace-pre-wrap break-all">
              {embedSnippet}
            </pre>
            <button
              type="button"
              onClick={handleCopySnippet}
              className="w-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5"
            >
              {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSnippet ? "¡Copiado!" : "Copiar código para sitio web"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
