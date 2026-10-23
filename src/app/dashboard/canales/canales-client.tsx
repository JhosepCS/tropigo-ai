"use client";

import { useState, useEffect } from "react";
import {
  QrCode,
  Globe,
  Smartphone,
  Copy,
  Check,
  RefreshCw,
  Power,
  ExternalLink,
  Code,
  MessageCircle,
  Eye,
} from "lucide-react";

interface CanalesClientProps {
  initialWpChannel: any;
  initialWebChannel: any;
  businessName: string;
}

export function CanalesClient({
  initialWpChannel,
  initialWebChannel,
  businessName,
}: CanalesClientProps) {
  // WhatsApp State
  const [wpStatus, setWpStatus] = useState(initialWpChannel?.status || "disconnected");
  const [wpPhone, setWpPhone] = useState(initialWpChannel?.phone || "");
  const [wpQr, setWpQr] = useState<string | null>(initialWpChannel?.qrCode || null);

  // Web Chat Settings State
  const initialWebSettings = (() => {
    try {
      return JSON.parse(initialWebChannel?.settingsJson || "{}");
    } catch (e) {
      return {
        enabled: true,
        primaryColor: "#0F766E",
        welcomeMessage: "¡Hola! ¿En qué podemos ayudarte en Clínica Dental Lumen?",
      };
    }
  })();

  const [webChatEnabled, setWebChatEnabled] = useState(initialWebSettings.enabled ?? true);
  const [primaryColor, setPrimaryColor] = useState(initialWebSettings.primaryColor || "#0F766E");
  const [welcomeText, setWelcomeText] = useState(
    initialWebSettings.welcomeMessage || "¡Hola! ¿En qué podemos ayudarte en Clínica Dental Lumen?"
  );
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [savedWeb, setSavedWeb] = useState(false);

  // SSE con fallback a polling para actualizar el código QR de WhatsApp en tiempo real
  useEffect(() => {
    let es: EventSource | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;

    try {
      es = new EventSource("/api/channels/whatsapp/sse");
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setWpStatus(data.status);
          setWpQr(data.qrCode);
          if (data.phone) setWpPhone(data.phone);
        } catch (e) {}
      };
      es.onerror = () => {
        // Fallback a polling si SSE falla
        if (!fallbackInterval) {
          fallbackInterval = setInterval(async () => {
            try {
              const res = await fetch("/api/channels/whatsapp/status");
              if (res.ok) {
                const data = await res.json();
                setWpStatus(data.status);
                setWpQr(data.qrCode);
                if (data.phone) setWpPhone(data.phone);
              }
            } catch (e) {}
          }, 3000);
        }
      };
    } catch (e) {
      fallbackInterval = setInterval(async () => {
        try {
          const res = await fetch("/api/channels/whatsapp/status");
          if (res.ok) {
            const data = await res.json();
            setWpStatus(data.status);
            setWpQr(data.qrCode);
            if (data.phone) setWpPhone(data.phone);
          }
        } catch (err) {}
      }, 3000);
    }

    return () => {
      if (es) es.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, []);

  const handleDisconnectWp = async () => {
    try {
      await fetch("/api/channels/whatsapp/disconnect", { method: "POST" });
      setWpStatus("disconnected");
      setWpQr(null);
      setWpPhone("");
    } catch (e) {
      console.error(e);
    }
  };

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

  const embedSnippet = `<script src="${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/widget.js" data-business="${businessName}" data-color="${primaryColor}"></script>`;

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(embedSnippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* 1. Canal WhatsApp (Baileys con QR persistente) */}
      <div className="bg-white rounded-2xl border border-[#EAECF0] p-6 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#EAECF0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl">
              📲
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#101828]">WhatsApp con Baileys</h3>
              <p className="text-xs text-[#667085]">
                Conexión persistente guardada en disco (WHATSAPP_SESSION_DIR). Reconecta automáticamente tras reinicios.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-3 py-1 rounded-full font-semibold border flex items-center gap-1.5 ${
                wpStatus === "connected"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : wpStatus === "scanning_qr"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-gray-100 text-[#475467] border-[#EAECF0]"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  wpStatus === "connected"
                    ? "bg-emerald-500"
                    : wpStatus === "scanning_qr"
                    ? "bg-amber-500 animate-pulse"
                    : "bg-gray-400"
                }`}
              />
              {wpStatus === "connected"
                ? `Conectado: ${wpPhone || "+34 612 345 678"}`
                : wpStatus === "scanning_qr"
                ? "Esperando escaneo de QR"
                : "Desconectado"}
            </span>

            {wpStatus === "connected" && (
              <button
                onClick={handleDisconnectWp}
                className="text-xs text-red-600 hover:text-red-700 border border-red-200 hover:bg-red-50 px-3 py-1 rounded-lg font-medium transition-colors"
              >
                Desconectar
              </button>
            )}
          </div>
        </div>

        {/* Visor de Código QR Grande */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 py-4">
          <div className="bg-white p-4 rounded-2xl border-2 border-[#EAECF0] shadow-sm flex items-center justify-center w-64 h-64">
            {wpQr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={wpQr}
                alt="Código QR de WhatsApp"
                className="w-full h-full object-contain"
              />
            ) : wpStatus === "connected" ? (
              <div className="flex flex-col items-center justify-center text-center p-4 space-y-2">
                <Smartphone className="w-12 h-12 text-emerald-600" />
                <p className="font-semibold text-xs text-[#101828]">Número Vinculado</p>
                <p className="text-[11px] text-[#667085] font-mono">
                  {wpPhone || "+34 612 345 678"}
                </p>
                <p className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  LID sincronizado
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-4 space-y-2 text-[#667085]">
                <RefreshCw className="w-8 h-8 animate-spin text-[#98A2B3]" />
                <p className="text-xs">Iniciando worker de Baileys...</p>
              </div>
            )}
          </div>

          <div className="space-y-4 max-w-sm text-xs text-[#475467]">
            <div className="space-y-2">
              <h4 className="font-bold text-[#101828]">Pasos para conectar:</h4>
              <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-[#667085]">
                <li>Abre WhatsApp en el teléfono de la clínica o negocio.</li>
                <li>Toca <strong>Ajustes &gt; Dispositivos vinculados</strong>.</li>
                <li>Apunta la cámara al código QR grande de la izquierda.</li>
                <li>¡Listo! El asistente comenzará a atender los mensajes que entren.</li>
              </ol>
            </div>

            <div className="p-3.5 bg-[#F9FAFB] rounded-xl border border-[#EAECF0] text-[11px] space-y-1.5 text-[#667085]">
              <p>
                ✅ <strong>Buffer de 8 segundos:</strong> Agrupa mensajes seguidos antes de responder.
              </p>
              <p>
                ✅ <strong>Indicador «Escribiendo»:</strong> Muestra presencia natural antes del envío.
              </p>
              <p>
                ✅ <strong>Filtro estricto:</strong> Ignora grupos (@g.us), estados y mensajes propios.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Chat para tu Web */}
      <div className="bg-white rounded-2xl border border-[#EAECF0] p-6 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#EAECF0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center text-xl">
              💬
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#101828]">Chat para tu Web</h3>
              <p className="text-xs text-[#667085]">
                Una burbuja flotante para insertar en cualquier sitio web que habla directamente con este asistente.
              </p>
            </div>
          </div>

          <a
            href="/demo"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
          >
            <Eye className="w-3.5 h-3.5 text-teal-700" />
            <span>Ver página de demostración (/demo)</span>
            <ExternalLink className="w-3 h-3 text-teal-600 ml-0.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Configuración Visual */}
          <div className="lg:col-span-7 space-y-4 text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#EAECF0] bg-[#FAFAFA]">
              <div>
                <p className="font-semibold text-[#101828]">Burbuja de chat en la web</p>
                <p className="text-[11px] text-[#667085]">Activa o desactiva la visibilidad del widget</p>
              </div>
              <button
                type="button"
                onClick={() => setWebChatEnabled(!webChatEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  webChatEnabled ? "bg-teal-600" : "bg-gray-200"
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
              <label className="font-medium text-[#344054]">Color principal del widget</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-[#EAECF0] p-1"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-xs font-mono text-[#101828] w-28"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-[#344054]">Texto de bienvenida</label>
              <input
                type="text"
                value={welcomeText}
                onChange={(e) => setWelcomeText(e.target.value)}
                className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
              />
            </div>

            {/* Código de Inserción */}
            <div className="space-y-2 pt-2">
              <label className="font-medium text-[#344054]">
                Fragmento de código para pegar en tu web:
              </label>
              <div className="relative">
                <pre className="bg-[#101828] text-[#E4E7EC] p-3.5 rounded-xl font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                  {embedSnippet}
                </pre>
                <button
                  type="button"
                  onClick={handleCopySnippet}
                  className="absolute right-2 top-2 bg-white/10 hover:bg-white/20 text-white p-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors"
                >
                  {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSnippet ? "Copiado" : "Copiar"}</span>
                </button>
              </div>
              <p className="text-[11px] text-[#667085]">
                Pega esta línea antes del cierre de la etiqueta <code>&lt;/body&gt;</code> en WordPress, Shopify, Webflow o HTML puro.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveWebSettings}
                className="bg-teal-700 hover:bg-teal-800 text-white font-semibold px-5 py-2 rounded-xl text-xs transition-colors shadow-2xs"
              >
                {savedWeb ? "¡Guardado!" : "Guardar Personalización"}
              </button>
            </div>
          </div>

          {/* Vista Previa en Vivo de la Burbuja */}
          <div className="lg:col-span-5 bg-[#F9FAFB] p-5 rounded-2xl border border-[#EAECF0] flex flex-col items-center justify-center space-y-4">
            <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">
              Vista Previa en Vivo
            </span>

            {/* Mockup de la ventana del chat */}
            <div className="w-full max-w-xs bg-white rounded-2xl shadow-lg border border-[#EAECF0] overflow-hidden flex flex-col h-80">
              <div
                style={{ backgroundColor: primaryColor }}
                className="p-3 text-white flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                    L
                  </div>
                  <span className="font-bold text-xs">{businessName}</span>
                </div>
              </div>

              <div className="flex-1 p-3 bg-[#F9FAFB] space-y-2 overflow-y-auto text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-[#EAECF0] text-[#344054] max-w-[85%] rounded-tl-none shadow-2xs">
                  {welcomeText}
                </div>
                <div
                  style={{ backgroundColor: primaryColor }}
                  className="p-2.5 rounded-xl text-white max-w-[85%] ml-auto rounded-tr-none text-xs"
                >
                  Hola, quería pedir cita para una revisión dental.
                </div>
              </div>

              <div className="p-2 border-t border-[#EAECF0] bg-white flex items-center gap-2 text-xs">
                <input
                  type="text"
                  placeholder="Escribe tu consulta..."
                  readOnly
                  className="flex-1 bg-[#F9FAFB] border border-[#D0D5DD] rounded-lg px-2.5 py-1.5 text-xs text-[#98A2B3]"
                />
                <button
                  style={{ backgroundColor: primaryColor }}
                  className="p-1.5 rounded-lg text-white"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Burbuja Flotante */}
            <div className="flex items-center gap-2 text-xs text-[#667085]">
              <span>Burbuja flotante:</span>
              <div
                style={{ backgroundColor: primaryColor }}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md"
              >
                <MessageCircle className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
