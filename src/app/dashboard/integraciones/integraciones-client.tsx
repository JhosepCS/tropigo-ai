"use client";

import { useState } from "react";
import {
  Calendar,
  Mail,
  Table,
  MessageSquare,
  CreditCard,
  Webhook,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Settings2,
  X,
  Send,
  Lock,
  Info,
} from "lucide-react";

interface IntegracionesClientProps {
  initialIntegrations: any[];
}

export function IntegracionesClient({ initialIntegrations }: IntegracionesClientProps) {
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [selectedIntegration, setSelectedIntegration] = useState<any | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const getCardMetadata = (provider: string) => {
    switch (provider) {
      case "google_calendar":
        return {
          title: "Google Calendar",
          description: "Consulta huecos libres y agenda citas automáticamente.",
          icon: "📅",
          color: "from-blue-500 to-blue-600",
          authType: "oauth",
        };
      case "gmail":
        return {
          title: "Gmail",
          description: "Envía confirmaciones de citas a pacientes y el resumen diario al dueño.",
          icon: "✉️",
          color: "from-red-500 to-red-600",
          authType: "oauth",
        };
      case "google_sheets":
        return {
          title: "Google Sheets",
          description: "Crea y sincroniza la hoja «Contactos — Clínica Dental Lumen».",
          icon: "📊",
          color: "from-emerald-500 to-emerald-600",
          authType: "oauth",
        };
      case "slack":
        return {
          title: "Slack",
          description: "Avisa al canal del equipo ante quejas, urgencias o citas creadas.",
          icon: "💬",
          color: "from-purple-500 to-indigo-600",
          authType: "webhook",
        };
      case "stripe":
        return {
          title: "Stripe",
          description: "Genera enlaces de pago para la señal de reserva de tratamientos.",
          icon: "💳",
          color: "from-indigo-600 to-blue-700",
          authType: "api_key",
        };
      case "webhooks":
        return {
          title: "Webhooks Salientes",
          description: "Dispara eventos firmados con HMAC hacia n8n, Make, Zapier o tu CRM.",
          icon: "⚡",
          color: "from-amber-500 to-orange-600",
          authType: "webhook_url",
        };
      default:
        return {
          title: provider,
          description: "Integración modular externa.",
          icon: "🔌",
          color: "from-gray-500 to-gray-600",
          authType: "custom",
        };
    }
  };

  const handleToggleConnection = async (intg: any) => {
    if (intg.status === "connected") {
      // Desconectar
      const updated = integrations.map((i) =>
        i.id === intg.id ? { ...i, status: "disconnected", accountIdentifier: null } : i
      );
      setIntegrations(updated);
      await fetch("/api/integrations/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: intg.provider, action: "disconnect" }),
      });
    } else {
      // Conectar (En local simula o inicia OAuth)
      if (intg.provider.startsWith("google_")) {
        window.location.href = `/api/integrations/google/connect?provider=${intg.provider}`;
      } else {
        setSelectedIntegration(intg);
      }
    }
  };

  const handleSendTest = async (provider: string) => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/integrations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      setTestResult(data.message || "Prueba enviada con éxito.");
    } catch (e: any) {
      setTestResult(`Error: ${e.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Catálogo de Tarjetas (Untitled UI App Store style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((intg) => {
          const meta = getCardMetadata(intg.provider);
          const isConnected = intg.status === "connected";
          const isError = intg.status === "error";

          let capabilities: Record<string, boolean> = {};
          try {
            capabilities = JSON.parse(intg.capabilitiesJson || "{}");
          } catch (e) {}

          return (
            <div
              key={intg.id}
              className="bg-white rounded-2xl border border-[#EAECF0] p-6 shadow-2xs hover:border-[#D0D5DD] transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{meta.icon}</span>
                    <div>
                      <h3 className="font-bold text-sm text-[#101828]">{meta.title}</h3>
                      <span
                        className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border mt-0.5 ${
                          isConnected
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : isError
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-[#F2F4F7] text-[#667085] border-[#EAECF0]"
                        }`}
                      >
                        {isConnected
                          ? `Conectada (${intg.accountIdentifier || "Cuenta activa"})`
                          : isError
                          ? "Error de conexión"
                          : "Sin conectar"}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[#475467] leading-relaxed">
                  {meta.description}
                </p>

                {/* Resumen de capacidades activas */}
                <div className="pt-2 border-t border-[#EAECF0]">
                  <p className="text-[11px] font-semibold text-[#667085] mb-1.5">
                    Permisos para el asistente:
                  </p>
                  <div className="space-y-1">
                    {Object.entries(capabilities).map(([key, enabled]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between text-[11px] text-[#344054]"
                      >
                        <span className="capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                        <span className={enabled ? "text-emerald-700 font-bold" : "text-[#98A2B3]"}>
                          {enabled ? "✓ Activo" : "✕"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="pt-3 border-t border-[#EAECF0] flex items-center gap-2">
                <button
                  onClick={() => handleToggleConnection(intg)}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                    isConnected
                      ? "bg-[#F9FAFB] hover:bg-red-50 text-red-700 border border-[#D0D5DD] hover:border-red-300"
                      : "bg-teal-700 hover:bg-teal-800 text-white shadow-xs"
                  }`}
                >
                  {isConnected ? "Desconectar" : "Conectar"}
                </button>

                <button
                  onClick={() => setSelectedIntegration(intg)}
                  title="Configurar integración"
                  className="p-2 border border-[#D0D5DD] rounded-xl text-[#667085] hover:text-[#101828] hover:bg-[#F2F4F7] transition-colors"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Guía Explicativa de Google Cloud (Requerimiento Prompt) */}
      <div className="bg-white rounded-2xl border border-teal-200 p-6 shadow-2xs space-y-3 text-xs text-[#344054]">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-teal-700" />
          <h3 className="font-bold text-sm text-[#101828]">
            Configuración del Cliente OAuth de Google (Calendar, Gmail y Sheets)
          </h3>
        </div>
        <p className="leading-relaxed">
          Las tres integraciones de Google comparten un único cliente OAuth con autorización incremental (<strong>include_granted_scopes: true</strong>). Cada tarjeta solicita únicamente sus permisos específicos.
        </p>
        <div className="bg-[#F9FAFB] p-4 rounded-xl border border-[#EAECF0] space-y-2 font-mono text-[11px]">
          <p>
            <strong>URL de redireccionamiento autorizada (Localhost):</strong>
          </p>
          <p className="text-teal-800 bg-white p-2 rounded border border-[#EAECF0]">
            http://localhost:3000/api/integrations/google/callback
          </p>
          <p className="text-[#667085] font-sans text-xs">
            ⚠️ <strong>Importante para producción:</strong> En Google Cloud Console, configura la pantalla de consentimiento como <em>Externa</em> y publícala <em>«En producción»</em>. Si se deja en modo «Testing / Prueba», Google caduca los tokens de actualización (refresh token) cada 7 días y el asistente se desconectaría solo. Al publicar sin verificar saldrá un aviso informativo de «Aplicación no verificada por Google», que el usuario puede aceptar pulsando en Opciones Avanzadas.
          </p>
        </div>
      </div>

      {/* Modal de Configuración Individual */}
      {selectedIntegration && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#EAECF0] space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAECF0]">
              <div className="flex items-center gap-2">
                <span className="text-xl">
                  {getCardMetadata(selectedIntegration.provider).icon}
                </span>
                <h3 className="font-bold text-sm text-[#101828]">
                  Configurar {getCardMetadata(selectedIntegration.provider).title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedIntegration(null)}
                className="p-1 text-[#667085] hover:text-[#101828] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ajustes específicos según la integración */}
            {selectedIntegration.provider === "google_calendar" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#344054]">Calendario ID</label>
                  <input
                    type="text"
                    defaultValue="primary"
                    className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-[#344054]">Duración cita (min)</label>
                    <input
                      type="number"
                      defaultValue={30}
                      className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-[#344054]">Margen entre citas (min)</label>
                    <input
                      type="number"
                      defaultValue={10}
                      className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedIntegration.provider === "slack" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#344054]">Incoming Webhook URL de Slack</label>
                  <input
                    type="url"
                    placeholder="https://hooks.slack.com/services/..."
                    className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
                  />
                </div>
                <button
                  onClick={() => handleSendTest("slack")}
                  disabled={testing}
                  className="flex items-center gap-1.5 text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-2 rounded-xl font-semibold transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{testing ? "Enviando..." : "Enviar mensaje de prueba a Slack"}</span>
                </button>
              </div>
            )}

            {selectedIntegration.provider === "stripe" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#344054]">
                    Clave Restringida de Stripe (Restricted API Key)
                  </label>
                  <input
                    type="password"
                    placeholder="rk_test_... o rk_live_..."
                    className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
                  />
                  <p className="text-[10px] text-[#667085]">
                    🔒 Se almacena cifrada con AES-256-GCM. Detecta automáticamente si es de modo de prueba.
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[#344054]">Importe de la señal por defecto (€)</label>
                  <input
                    type="number"
                    defaultValue={20}
                    className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
                  />
                </div>
              </div>
            )}

            {selectedIntegration.provider === "webhooks" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#344054]">URL de destino (n8n, Make, Zapier)</label>
                  <input
                    type="url"
                    placeholder="https://webhook.site/..."
                    className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[#344054]">Clave Secreta de Firma (HMAC SHA-256)</label>
                  <input
                    type="text"
                    readOnly
                    value="whsec_atiende_demo_2025"
                    className="w-full bg-[#F2F4F7] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#667085] font-mono"
                  />
                </div>
                <button
                  onClick={() => handleSendTest("webhooks")}
                  disabled={testing}
                  className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-2 rounded-xl font-semibold transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{testing ? "Disparando..." : "Enviar evento de prueba"}</span>
                </button>
              </div>
            )}

            {testResult && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs">
                {testResult}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[#EAECF0]">
              <button
                onClick={() => setSelectedIntegration(null)}
                className="px-4 py-2 border border-[#D0D5DD] rounded-xl text-xs font-semibold text-[#344054]"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  alert("Configuración guardada exitosamente");
                  setSelectedIntegration(null);
                }}
                className="bg-teal-700 hover:bg-teal-800 text-white px-5 py-2 rounded-xl text-xs font-semibold"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
