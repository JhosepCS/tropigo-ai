"use client";

import { useState, useEffect } from "react";
import {
  QrCode,
  ShieldCheck,
  Globe,
  Smartphone,
  Copy,
  Check,
  RefreshCw,
  Power,
  Lock,
  Radio,
  ExternalLink,
} from "lucide-react";

interface WhatsAppClientProps {
  initialConfig: any;
}

export function WhatsAppClientView({ initialConfig }: WhatsAppClientProps) {
  const [config, setConfig] = useState(initialConfig || {});
  const [activeTab, setActiveTab] = useState<"META_CLOUD_API" | "BAILEYS_QR">(
    initialConfig?.activeProvider || "BAILEYS_QR"
  );
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [qrCode, setQrCode] = useState(initialConfig?.baileysQr || null);
  const [baileysStatus, setBaileysStatus] = useState(
    initialConfig?.baileysStatus || "DISCONNECTED"
  );

  // Formulario Meta
  const [phoneNumberId, setPhoneNumberId] = useState(config?.metaPhoneNumberId || "");
  const [wabaId, setWabaId] = useState(config?.metaWabaId || "");
  const [systemToken, setSystemToken] = useState("");
  const [verifyToken, setVerifyToken] = useState(
    config?.metaWebhookVerifyToken || "tropigo_verify_token_2025"
  );
  const [appSecret, setAppSecret] = useState("");

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/meta`
      : "http://localhost:3000/api/webhooks/meta";

  // Polling del estado de Baileys / QR
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/whatsapp/status");
        if (res.ok) {
          const data = await res.json();
          setQrCode(data.baileysQr);
          setBaileysStatus(data.baileysStatus);
        }
      } catch (e) {
        // Ignorar
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveMeta = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/whatsapp/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activeProvider: activeTab,
          metaPhoneNumberId: phoneNumberId,
          metaWabaId: wabaId,
          metaSystemToken: systemToken,
          metaWebhookVerifyToken: verifyToken,
          metaAppSecret: appSecret,
        }),
      });

      if (res.ok) {
        alert("Configuración de Meta guardada exitosamente.");
      }
    } catch (e) {
      alert("Error al guardar la configuración.");
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchProvider = async (provider: "META_CLOUD_API" | "BAILEYS_QR") => {
    setActiveTab(provider);
    try {
      await fetch("/api/whatsapp/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeProvider: provider }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Selector Maestro de Modo */}
      <div className="bg-white p-4 rounded-2xl border border-[#EAECF0] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-sm text-[#101828]">Motor Activo de WhatsApp</h3>
          <p className="text-xs text-[#667085]">
            Selecciona qué canal procesará los mensajes de Tropigo en este momento.
          </p>
        </div>

        <div className="flex bg-[#F2F4F7] p-1 rounded-xl border border-[#EAECF0]">
          <button
            onClick={() => handleSwitchProvider("BAILEYS_QR")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "BAILEYS_QR"
                ? "bg-white text-[#101828] shadow-xs"
                : "text-[#667085] hover:text-[#101828]"
            }`}
          >
            <QrCode className="w-4 h-4 text-emerald-600" />
            <span>Baileys (QR Local)</span>
          </button>

          <button
            onClick={() => handleSwitchProvider("META_CLOUD_API")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "META_CLOUD_API"
                ? "bg-white text-[#101828] shadow-xs"
                : "text-[#667085] hover:text-[#101828]"
            }`}
          >
            <Globe className="w-4 h-4 text-blue-600" />
            <span>Meta Cloud API (Oficial)</span>
          </button>
        </div>
      </div>

      {/* Contenido según la pestaña activa */}
      {activeTab === "BAILEYS_QR" ? (
        <div className="bg-white rounded-2xl border border-[#EAECF0] p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-base text-[#101828]">Conexión QR de WhatsApp</h3>
              <p className="text-xs text-[#667085]">
                Escanea este código QR desde tu aplicación de WhatsApp (Dispositivos vinculados).
              </p>
            </div>

            <span
              className={`text-xs px-3 py-1 rounded-full font-medium border flex items-center gap-1.5 ${
                baileysStatus === "CONNECTED"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : baileysStatus === "SCAN_QR"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-gray-100 text-[#475467] border-[#EAECF0]"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  baileysStatus === "CONNECTED"
                    ? "bg-emerald-500"
                    : baileysStatus === "SCAN_QR"
                    ? "bg-amber-500 animate-pulse"
                    : "bg-gray-400"
                }`}
              />
              {baileysStatus === "CONNECTED"
                ? "Conectado y Escuchando"
                : baileysStatus === "SCAN_QR"
                ? "Esperando escaneo de QR"
                : "Desconectado"}
            </span>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-8 py-6">
            <div className="bg-white p-4 rounded-2xl border-2 border-[#EAECF0] shadow-sm flex items-center justify-center w-64 h-64">
              {qrCode ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrCode}
                  alt="Código QR de WhatsApp"
                  className="w-full h-full object-contain"
                />
              ) : baileysStatus === "CONNECTED" ? (
                <div className="flex flex-col items-center justify-center text-center p-4 space-y-2">
                  <Smartphone className="w-12 h-12 text-emerald-600" />
                  <p className="font-semibold text-xs text-[#101828]">
                    Número Vinculado
                  </p>
                  <p className="text-[11px] text-[#667085]">
                    {config?.connectedPhone || "+591 (Trópico de Cochabamba)"}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-4 space-y-2 text-[#667085]">
                  <RefreshCw className="w-8 h-8 animate-spin text-[#98A2B3]" />
                  <p className="text-xs">Generando código QR con Baileys...</p>
                </div>
              )}
            </div>

            <div className="space-y-4 max-w-sm text-xs text-[#475467]">
              <div className="space-y-2">
                <h4 className="font-semibold text-[#101828]">Cómo vincular tu WhatsApp:</h4>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-[#667085]">
                  <li>Abre WhatsApp en tu teléfono móvil.</li>
                  <li>Toca <strong>Menú (⋮)</strong> o <strong>Ajustes</strong>.</li>
                  <li>Selecciona <strong>Dispositivos vinculados</strong>.</li>
                  <li>Toca <strong>Vincular un dispositivo</strong> y apunta al código QR.</li>
                </ol>
              </div>

              <div className="p-3 bg-[#F9FAFB] rounded-xl border border-[#EAECF0] text-[11px] space-y-1 text-[#667085]">
                <p>
                  ✅ <strong>Buffer de 8 segundos activo:</strong> Agrupa mensajes consecutivos del cliente.
                </p>
                <p>
                  ✅ <strong>Filtro estricto:</strong> Ignora grupos y estados.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#EAECF0] p-6 shadow-xs space-y-6">
          <div>
            <h3 className="font-semibold text-base text-[#101828]">
              API Oficial de Meta (WhatsApp Business Cloud API)
            </h3>
            <p className="text-xs text-[#667085]">
              Conecta Tropigo directamente a los servidores de Meta sin depender de un teléfono encendido.
            </p>
          </div>

          {/* Webhook URL para Facebook Developers */}
          <div className="bg-[#F9FAFB] p-4 rounded-xl border border-[#EAECF0] space-y-2">
            <label className="text-xs font-semibold text-[#101828]">
              URL de Webhook (Copia y pega en Meta Developer Console):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="flex-1 bg-white border border-[#D0D5DD] rounded-lg px-3 py-2 text-xs font-mono text-[#344054]"
              />
              <button
                onClick={() => handleCopy(webhookUrl)}
                className="flex items-center gap-1.5 bg-white border border-[#D0D5DD] hover:bg-[#F2F4F7] text-[#344054] px-3 py-2 rounded-lg text-xs font-medium transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copiado" : "Copiar"}</span>
              </button>
            </div>
          </div>

          {/* Campos de Configuración */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#344054]">
                Phone Number ID (ID del número de teléfono)
              </label>
              <input
                type="text"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                placeholder="Ej: 104829104812394"
                className="w-full text-xs bg-white border border-[#D0D5DD] rounded-lg px-3 py-2 text-[#101828] focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#344054]">
                WABA ID (WhatsApp Business Account ID)
              </label>
              <input
                type="text"
                value={wabaId}
                onChange={(e) => setWabaId(e.target.value)}
                placeholder="Ej: 294810293810294"
                className="w-full text-xs bg-white border border-[#D0D5DD] rounded-lg px-3 py-2 text-[#101828] focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#344054]">
                Token Permanente de Sistema (System User Token)
              </label>
              <input
                type="password"
                value={systemToken}
                onChange={(e) => setSystemToken(e.target.value)}
                placeholder="EAAG..."
                className="w-full text-xs bg-white border border-[#D0D5DD] rounded-lg px-3 py-2 text-[#101828] focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <span className="text-[10px] text-[#667085]">
                🔒 Se almacena cifrado en la base de datos con AES-256-GCM.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#344054]">
                Webhook Verify Token
              </label>
              <input
                type="text"
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value)}
                placeholder="tropigo_verify_token_2025"
                className="w-full text-xs bg-white border border-[#D0D5DD] rounded-lg px-3 py-2 text-[#101828] focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleSaveMeta}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-[#D0D5DD] text-white px-5 py-2 rounded-xl text-xs font-semibold transition-colors shadow-xs"
            >
              {saving ? "Guardando..." : "Guardar Credenciales de Meta"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
