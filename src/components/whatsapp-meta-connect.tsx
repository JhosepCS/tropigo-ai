"use client";

import { useState, useEffect } from "react";
import {
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Power,
  Key,
  ExternalLink,
  QrCode,
  Lock,
  Copy,
  Check,
  HelpCircle,
  Layers,
  ArrowRight,
  Info,
  CheckCircle,
  XCircle,
  Hash,
} from "lucide-react";
import { MaskedWhatsAppStatus } from "@/lib/whatsapp/meta-manager";

interface WhatsAppMetaConnectProps {
  initialStatus?: MaskedWhatsAppStatus;
}

export function WhatsAppMetaConnect({ initialStatus }: WhatsAppMetaConnectProps) {
  const [status, setStatus] = useState<MaskedWhatsAppStatus | null>(initialStatus || null);
  const [loading, setLoading] = useState(!initialStatus);
  const [activeTab, setActiveTab] = useState<"standard" | "embedded" | "coexistence">("standard");

  // Formulario estándar
  const [phoneNumberId, setPhoneNumberId] = useState(initialStatus?.metaPhoneNumberId || "");
  const [wabaId, setWabaId] = useState(initialStatus?.metaWabaId || "");
  const [systemToken, setSystemToken] = useState("");
  const [appId, setAppId] = useState(initialStatus?.metaAppId || "");
  const [appSecret, setAppSecret] = useState("");
  const [verifyToken, setVerifyToken] = useState(initialStatus?.metaWebhookVerifyToken || "tropigo_verify_token_2025");
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Verificación en vivo contra Graph API
  const [verifying, setVerifying] = useState(false);
  const [verifyOutcome, setVerifyOutcome] = useState<{ success: boolean; message: string } | null>(null);

  // Desconexión
  const [disconnecting, setDisconnecting] = useState(false);

  // Coexistencia
  const [coexistenceLoading, setCoexistenceLoading] = useState(false);
  const [coexistenceResult, setCoexistenceResult] = useState<{
    success: boolean;
    qr?: string;
    code?: string;
    message?: string;
    error?: string;
  } | null>(null);

  // Embedded Signup
  const [embeddedLoading, setEmbeddedLoading] = useState(false);
  const [embeddedError, setEmbeddedError] = useState<string | null>(null);

  // Portapapeles
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // 1. Cargar estado inicial
  const loadStatus = async () => {
    try {
      const res = await fetch("/api/channels/whatsapp/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (data.metaPhoneNumberId) setPhoneNumberId(data.metaPhoneNumberId);
        if (data.metaWabaId) setWabaId(data.metaWabaId);
        if (data.metaAppId) setAppId(data.metaAppId);
        if (data.metaWebhookVerifyToken) setVerifyToken(data.metaWebhookVerifyToken);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialStatus) {
      loadStatus();
    }
  }, [initialStatus]);

  // 2. Guardar credenciales estándar
  const handleSaveStandard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumberId.trim()) {
      setSaveMessage({ type: "error", text: "El Phone Number ID es obligatorio." });
      return;
    }

    setSavingCredentials(true);
    setSaveMessage(null);
    setVerifyOutcome(null);

    try {
      const res = await fetch("/api/channels/whatsapp/save-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metaPhoneNumberId: phoneNumberId.trim(),
          metaWabaId: wabaId.trim() || undefined,
          metaSystemToken: systemToken.trim() || undefined,
          metaAppId: appId.trim() || undefined,
          metaAppSecret: appSecret.trim() || undefined,
          metaWebhookVerifyToken: verifyToken.trim() || undefined,
          autoVerify: Boolean(systemToken.trim() || status?.hasSystemToken),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar credenciales");

      setStatus(data.status);
      setSystemToken(""); // Limpiar token del campo para seguridad
      setAppSecret("");

      if (data.verification?.success) {
        setSaveMessage({
          type: "success",
          text: `✅ Credenciales guardadas y verificadas con Meta. Conectado como "${data.verification.accountDetails?.verifiedName}".`,
        });
      } else if (data.verification?.error) {
        setSaveMessage({
          type: "error",
          text: `⚠️ Credenciales guardadas pero Meta reportó error: ${data.verification.error}`,
        });
      } else {
        setSaveMessage({
          type: "success",
          text: "✅ Credenciales cifradas en Supabase. Haz clic en 'Verificar Conexión' para validar con Meta.",
        });
      }
    } catch (err: any) {
      setSaveMessage({ type: "error", text: `❌ ${err.message}` });
    } finally {
      setSavingCredentials(false);
    }
  };

  // 3. Verificar conexión contra Graph API (prueba real)
  const handleVerify = async () => {
    setVerifying(true);
    setVerifyOutcome(null);

    try {
      const res = await fetch("/api/channels/whatsapp/verify", {
        method: "POST",
      });

      const data = await res.json();
      setStatus(data.status);

      if (data.success) {
        setVerifyOutcome({
          success: true,
          message: `Conexión oficial activa con Meta Graph API. Número: ${data.accountDetails?.displayPhone || "Verificado"} (${data.accountDetails?.verifiedName || "TropiGO"}).`,
        });
      } else {
        setVerifyOutcome({
          success: false,
          message: data.error || "Meta rechazó la verificación de las credenciales.",
        });
      }
    } catch (err: any) {
      setVerifyOutcome({
        success: false,
        message: `Fallo de red al verificar con Meta: ${err.message}`,
      });
    } finally {
      setVerifying(false);
    }
  };

  // 4. Desconectar de forma segura
  const handleDisconnect = async () => {
    if (!confirm("¿Deseas desconectar este número de WhatsApp? Se revocarán las credenciales activas del servidor.")) {
      return;
    }

    setDisconnecting(true);
    try {
      const res = await fetch("/api/channels/whatsapp/disconnect", { method: "POST" });
      if (res.ok) {
        await loadStatus();
        setVerifyOutcome(null);
        setSaveMessage({ type: "success", text: "WhatsApp desconectado de forma segura." });
      }
    } catch (e: any) {
      alert(`Error al desconectar: ${e.message}`);
    } finally {
      setDisconnecting(false);
    }
  };

  // 5. Iniciar solicitud de Coexistencia
  const handleInitiateCoexistence = async () => {
    setCoexistenceLoading(true);
    setCoexistenceResult(null);

    try {
      const res = await fetch("/api/channels/whatsapp/coexistence", { method: "POST" });
      const data = await res.json();
      setStatus(data.status);

      if (data.success) {
        setCoexistenceResult({
          success: true,
          qr: data.coexistenceQr,
          code: data.coexistenceCode,
          message: data.message,
        });
      } else {
        setCoexistenceResult({
          success: false,
          error: data.error || "Meta no aprobó la solicitud de coexistencia para este número.",
        });
      }
    } catch (err: any) {
      setCoexistenceResult({
        success: false,
        error: `Error al conectar con Meta Coexistence: ${err.message}`,
      });
    } finally {
      setCoexistenceLoading(false);
    }
  };

  // 6. Embedded Signup (Meta Login SDK)
  const launchEmbeddedSignup = () => {
    setEmbeddedError(null);
    if (!appId.trim()) {
      setEmbeddedError("Se requiere configurar el Meta App ID antes de iniciar Embedded Signup.");
      return;
    }

    setEmbeddedLoading(true);

    // Cargar Facebook SDK si no existe
    if (typeof window !== "undefined" && !(window as any).FB) {
      const script = document.createElement("script");
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        (window as any).FB.init({
          appId: appId.trim(),
          autoLogAppEvents: true,
          xfbml: true,
          version: "v21.0",
        });
        runFBLogin();
      };
      script.onerror = () => {
        setEmbeddedLoading(false);
        setEmbeddedError("No se pudo cargar el SDK oficial de Facebook. Comprueba tu conexión o bloqueadores de anuncios.");
      };
      document.body.appendChild(script);
    } else {
      runFBLogin();
    }
  };

  const runFBLogin = () => {
    const FB = (window as any).FB;
    if (!FB) {
      setEmbeddedLoading(false);
      setEmbeddedError("SDK de Facebook no inicializado.");
      return;
    }

    // Escuchar evento de sessionInfoListener para waba_id y phone_number_id
    const messageHandler = async (event: MessageEvent) => {
      if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com") return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data.type === "WA_EMBEDDED_SIGNUP") {
          if (data.event === "FINISH") {
            const { phone_number_id, waba_id } = data.data;
            if (phone_number_id) setPhoneNumberId(phone_number_id);
            if (waba_id) setWabaId(waba_id);
          }
        }
      } catch {}
    };

    window.addEventListener("message", messageHandler, { once: true });

    FB.login(
      async (response: any) => {
        setEmbeddedLoading(false);
        if (response.authResponse?.code) {
          // Enviar auth_code al backend para intercambio seguro
          try {
            const exRes = await fetch("/api/channels/whatsapp/embedded-signup", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                code: response.authResponse.code,
                phoneNumberId: phoneNumberId || undefined,
                wabaId: wabaId || undefined,
              }),
            });
            const exData = await exRes.json();
            if (exData.success) {
              await loadStatus();
              setSaveMessage({ type: "success", text: "✅ Vinculación con Meta Embedded Signup completada con éxito." });
            } else {
              setEmbeddedError(exData.error || "Fallo en el intercambio de token con Meta.");
            }
          } catch (err: any) {
            setEmbeddedError(err.message);
          }
        } else {
          setEmbeddedError("El usuario canceló el inicio de sesión con Meta o no otorgó los permisos requeridos.");
        }
      },
      {
        scope: "whatsapp_business_management,whatsapp_business_messaging",
        response_type: "code",
      }
    );
  };

  const copyToClipboard = (text: string, type: "url" | "token") => {
    navigator.clipboard.writeText(text);
    if (type === "url") {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } else {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2500);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-3xl border border-[#EAECF0] text-center space-y-3">
        <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto" />
        <p className="text-xs text-[#667085]">Consultando estado oficial de WhatsApp con Meta...</p>
      </div>
    );
  }

  const isConnected = status?.status === "CONNECTED";
  const isError = status?.status === "ERROR";

  return (
    <div className="space-y-6">
      {/* TARJETA DE ESTADO OFICIAL DE CONEXIÓN */}
      <div className="bg-white p-6 rounded-3xl border border-[#EAECF0] shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAECF0] pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                isConnected
                  ? "bg-emerald-100 text-emerald-700"
                  : isError
                  ? "bg-red-100 text-red-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <Smartphone className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-[#101828]">
                  WhatsApp Business Platform (Cloud API Oficial)
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isConnected
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : isError
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  {isConnected ? "Conectado Oficial" : isError ? "Error en Credenciales" : "Desconectado"}
                </span>
              </div>
              <p className="text-xs text-[#667085]">
                {isConnected
                  ? `Vinculado: ${status?.connectedAccountName || "TropiGO"} • ${status?.connectedPhone || status?.metaPhoneNumberId}`
                  : "Sin vinculación activa. Conecta tu número mediante Meta Cloud API oficial."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleVerify}
              disabled={verifying}
              className="text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${verifying ? "animate-spin text-emerald-600" : ""}`} />
              <span>{verifying ? "Verificando con Meta..." : "Verificar Conexión"}</span>
            </button>

            {isConnected && (
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="text-xs text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-colors"
              >
                <Power className="w-3.5 h-3.5" />
                <span>{disconnecting ? "Desconectando..." : "Desconectar"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Resumen de Información Oficial cuando está Conectado */}
        {isConnected && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Nombre Verificado</span>
              <p className="font-bold text-slate-900 mt-0.5">{status?.connectedAccountName || "TropiGO"}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Número de Teléfono</span>
              <p className="font-mono font-bold text-slate-900 mt-0.5">{status?.connectedPhone || "N/A"}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Fecha de Conexión</span>
              <p className="text-slate-700 mt-0.5">
                {status?.connectedAt ? new Date(status.connectedAt).toLocaleString("es-BO") : "Registrada"}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Calidad en Meta</span>
              <p className="text-emerald-700 font-bold mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{status?.qualityRating || "Alta / Verificada"}</span>
              </p>
            </div>
          </div>
        )}

        {/* Alerta de resultado de verificación */}
        {verifyOutcome && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-bold flex items-start gap-2 ${
              verifyOutcome.success
                ? "bg-emerald-50 text-emerald-950 border border-emerald-200"
                : "bg-red-50 text-red-950 border border-red-200"
            }`}
          >
            {verifyOutcome.success ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p>{verifyOutcome.message}</p>
              {!verifyOutcome.success && (
                <p className="text-[11px] font-normal mt-0.5 text-red-800">
                  Comprueba que el System Token tenga los permisos <code>whatsapp_business_messaging</code> y <code>whatsapp_business_management</code> en Meta for Developers.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* PESTAÑAS DE MÉTODOS DE CONEXIÓN OFICIAL */}
      <div className="bg-white rounded-3xl border border-[#EAECF0] shadow-2xs overflow-hidden">
        <div className="flex border-b border-[#EAECF0] bg-slate-50/50">
          <button
            type="button"
            onClick={() => setActiveTab("standard")}
            className={`px-5 py-3.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "standard"
                ? "border-emerald-600 text-emerald-800 bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Credenciales Oficiales Cloud API</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("embedded")}
            className={`px-5 py-3.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "embedded"
                ? "border-emerald-600 text-emerald-800 bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Embedded Signup (Login con Meta)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("coexistence")}
            className={`px-5 py-3.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "coexistence"
                ? "border-emerald-600 text-emerald-800 bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Coexistencia (WhatsApp Business App)</span>
          </button>
        </div>

        <div className="p-6">
          {/* ========================================================================= */}
          {/* MÉTODO 1: CREDENCIALES OFICIALES ESTÁNDAR                                */}
          {/* ========================================================================= */}
          {activeTab === "standard" && (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-black text-sm text-[#101828]">Configuración Estándar mediante Meta Cloud API</h4>
                  <p className="text-xs text-[#667085] mt-0.5">
                    Ingresa las credenciales de tu aplicación en Meta for Developers. El token de acceso se cifra con AES-256-GCM en el servidor y nunca se expone al navegador.
                  </p>
                </div>
                <a
                  href="https://developers.facebook.com/apps"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-emerald-700 hover:underline flex items-center gap-1 font-bold shrink-0"
                >
                  <span>Meta Developers Console</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {saveMessage && (
                <div
                  className={`p-3 rounded-2xl text-xs font-bold ${
                    saveMessage.type === "success"
                      ? "bg-emerald-50 text-emerald-950 border border-emerald-200"
                      : "bg-red-50 text-red-950 border border-red-200"
                  }`}
                >
                  {saveMessage.text}
                </div>
              )}

              <form onSubmit={handleSaveStandard} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Phone Number ID */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-800 flex items-center justify-between">
                    <span>Phone Number ID *</span>
                    <span className="text-[10px] text-slate-400">Identificador del número</span>
                  </label>
                  <input
                    type="text"
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                    placeholder="Ej: 104598234857219"
                    className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3.5 py-2 font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>

                {/* WhatsApp Business Account ID (WABA ID) */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-800 flex items-center justify-between">
                    <span>WABA ID (WhatsApp Business Account ID)</span>
                    <span className="text-[10px] text-slate-400">Identificador de cuenta</span>
                  </label>
                  <input
                    type="text"
                    value={wabaId}
                    onChange={(e) => setWabaId(e.target.value)}
                    placeholder="Ej: 984572018432195"
                    className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3.5 py-2 font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* System User Access Token */}
                <div className="space-y-1 md:col-span-2">
                  <label className="font-bold text-slate-800 flex items-center justify-between">
                    <span>System User Access Token (Token Permanente)</span>
                    <span className="text-[10px] text-emerald-700">
                      {status?.hasSystemToken ? "✓ Token guardado y cifrado" : "Requerido"}
                    </span>
                  </label>
                  <input
                    type="password"
                    value={systemToken}
                    onChange={(e) => setSystemToken(e.target.value)}
                    placeholder={status?.hasSystemToken ? "•••••••••••••••••••••••• (Deja vacío para conservar)" : "EAAJ..."}
                    className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3.5 py-2 font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-[#667085]">
                    Generado en Meta Business Manager &gt; Usuarios del sistema con permisos <code>whatsapp_business_messaging</code>.
                  </p>
                </div>

                {/* Meta App ID */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-800">Meta App ID (Opcional)</label>
                  <input
                    type="text"
                    value={appId}
                    onChange={(e) => setAppId(e.target.value)}
                    placeholder="Ej: 123456789012345"
                    className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3.5 py-2 font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Meta App Secret */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-800 flex items-center justify-between">
                    <span>Meta App Secret (Para firma de Webhook)</span>
                    <span className="text-[10px] text-slate-400">
                      {status?.hasAppSecret ? "✓ Guardado y cifrado" : "Opcional"}
                    </span>
                  </label>
                  <input
                    type="password"
                    value={appSecret}
                    onChange={(e) => setAppSecret(e.target.value)}
                    placeholder={status?.hasAppSecret ? "•••••••••••••••• (Deja vacío para conservar)" : "app_secret"}
                    className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3.5 py-2 font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Webhook Verify Token */}
                <div className="space-y-1 md:col-span-2">
                  <label className="font-bold text-slate-800">Token de Verificación del Webhook</label>
                  <input
                    type="text"
                    value={verifyToken}
                    onChange={(e) => setVerifyToken(e.target.value)}
                    className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3.5 py-2 font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="md:col-span-2 pt-2">
                  <button
                    type="submit"
                    disabled={savingCredentials}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-[#D0D5DD] text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{savingCredentials ? "Cifrando y Guardando..." : "Guardar Credenciales y Probar Conexión"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MÉTODO 2: EMBEDDED SIGNUP (LOGIN OFICIAL CON META)                       */}
          {/* ========================================================================= */}
          {activeTab === "embedded" && (
            <div className="space-y-6">
              <div>
                <h4 className="font-black text-sm text-[#101828]">Flujo Oficial Embedded Signup de Meta</h4>
                <p className="text-xs text-[#667085] mt-0.5">
                  Conecta tu número directamente abriendo el cuadro de diálogo oficial de Meta for Business. Selecciona tu empresa y número en segundos.
                </p>
              </div>

              {/* Verificación de Requisitos Previos */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Comprobación de Requisitos de la Aplicación Meta</span>
                </div>

                <div className="space-y-2 text-slate-700">
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-100">
                    <span>1. Meta App ID configurado:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {status?.metaAppId || "Falta configurar en Ajustes"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-100">
                    <span>2. Permisos requeridos en Meta:</span>
                    <span className="font-mono text-emerald-800 font-bold">
                      whatsapp_business_management, whatsapp_business_messaging
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-100">
                    <span>3. Producto agregado en Meta Developers:</span>
                    <span className="font-bold text-slate-900">WhatsApp &gt; Inicios de sesión rápidos</span>
                  </div>
                </div>
              </div>

              {embeddedError && (
                <div className="p-3 rounded-2xl bg-red-50 text-red-950 border border-red-200 text-xs font-bold">
                  ❌ {embeddedError}
                </div>
              )}

              {/* Botón Oficial de Conexión Meta */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={launchEmbeddedSignup}
                  disabled={embeddedLoading}
                  className="bg-[#1877F2] hover:bg-[#166FE5] disabled:bg-slate-300 text-white px-6 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>{embeddedLoading ? "Conectando con Meta..." : "Continuar con Facebook / Meta for Business"}</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MÉTODO 3: CONEXIÓN MEDIANTE COEXISTENCIA (WHATSAPP BUSINESS APP)          */}
          {/* ========================================================================= */}
          {activeTab === "coexistence" && (
            <div className="space-y-6">
              <div>
                <h4 className="font-black text-sm text-[#101828]">
                  Coexistencia de WhatsApp Business App (Celular + Cloud API)
                </h4>
                <p className="text-xs text-[#667085] mt-0.5">
                  La función de coexistencia oficial de Meta permite que conserves el uso de tu aplicación WhatsApp Business en tu teléfono móvil mientras TropiGO AI atiende a tus clientes en paralelo a través de la Cloud API.
                </p>
              </div>

              {/* Guía de Requisitos de Coexistencia */}
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs text-amber-950 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Requisitos de Coexistencia de Meta</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-amber-900 leading-relaxed text-[11px]">
                  <li>Tu número debe estar activo en la aplicación <strong>WhatsApp Business</strong> en tu celular (no cuenta de WhatsApp personal).</li>
                  <li>El número debe estar registrado en tu cuenta de WhatsApp Business Account (WABA) oficial.</li>
                  <li>No utilices automatizaciones no oficiales (Baileys o Web scraping); este proceso utiliza exclusivamente el endpoint de coexistencia de Meta Graph API.</li>
                </ul>
              </div>

              {/* Botón para solicitar vinculación */}
              <div>
                <button
                  type="button"
                  onClick={handleInitiateCoexistence}
                  disabled={coexistenceLoading || !status?.hasSystemToken}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${coexistenceLoading ? "animate-spin" : ""}`} />
                  <span>{coexistenceLoading ? "Consultando a Meta..." : "Solicitar Vinculación de Coexistencia a Meta"}</span>
                </button>
                {!status?.hasSystemToken && (
                  <p className="text-[11px] text-red-600 mt-1.5 font-medium">
                    Debes configurar primero el Phone Number ID y System Token en la pestaña &ldquo;Credenciales Oficiales&rdquo;.
                  </p>
                )}
              </div>

              {/* Resultado devuelto por Meta */}
              {coexistenceResult && (
                <div className="space-y-4 pt-2">
                  {coexistenceResult.success ? (
                    <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Solicitud de Coexistencia Aprobada por Meta</span>
                      </div>
                      <p className="text-xs text-emerald-950">{coexistenceResult.message}</p>

                      {/* Mostrar QR Oficial devuelto por Meta */}
                      {coexistenceResult.qr ? (
                        <div className="bg-white p-4 rounded-2xl border border-emerald-200 inline-block text-center space-y-2">
                          <img
                            src={coexistenceResult.qr}
                            alt="Código QR Oficial de Coexistencia Meta"
                            className="w-48 h-48 mx-auto object-contain"
                          />
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            Código QR Oficial de Meta
                          </p>
                        </div>
                      ) : null}

                      {/* Mostrar Código Alternativo de 8 dígitos de Meta */}
                      {coexistenceResult.code ? (
                        <div className="bg-white p-4 rounded-2xl border border-emerald-200 space-y-1.5 max-w-sm">
                          <span className="text-[10px] uppercase font-bold text-slate-400">
                            Código de Vinculación Alternativo de Meta:
                          </span>
                          <p className="text-xl font-mono font-black text-slate-900 tracking-widest">
                            {coexistenceResult.code}
                          </p>
                          <p className="text-[11px] text-slate-600">
                            Ingresa este código en WhatsApp Business App &gt; Dispositivos Vinculados &gt; Vincular con código de teléfono.
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-200 p-4 rounded-2xl text-xs text-red-950 space-y-1 font-bold">
                      <div className="flex items-center gap-1.5">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span>Respuesta de Meta:</span>
                      </div>
                      <p className="font-normal text-red-900 mt-1">{coexistenceResult.error}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* INFORMACIÓN DEL WEBHOOK DE META PARA CONFIGURAR EN EL PANEL */}
      <div className="bg-white p-6 rounded-3xl border border-[#EAECF0] shadow-2xs space-y-4 text-xs">
        <div className="flex items-center gap-2 border-b border-[#EAECF0] pb-3">
          <Layers className="w-4 h-4 text-emerald-600" />
          <h4 className="font-black text-sm text-[#101828]">
            Configuración del Webhook en Meta Developers
          </h4>
        </div>

        <p className="text-slate-600 leading-relaxed">
          Para que TropiGO AI reciba los mensajes de tus clientes en tiempo real, ingresa en tu panel de Meta Developers (&gt; WhatsApp &gt; Configuración &gt; Webhook) y configura los siguientes datos:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Callback URL */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between text-slate-700">
              <span className="font-bold text-[11px]">URL de Devolución de Llamada (Callback URL)</span>
              <button
                type="button"
                onClick={() => copyToClipboard(status?.webhookUrl || "", "url")}
                className="text-emerald-700 hover:text-emerald-800 text-[11px] font-bold flex items-center gap-1"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? "Copiado" : "Copiar"}</span>
              </button>
            </div>
            <p className="font-mono text-slate-900 font-bold break-all bg-white p-2 rounded-xl border border-slate-200 text-[11px]">
              {status?.webhookUrl || "https://tropigo.app/api/channels/whatsapp/webhook"}
            </p>
          </div>

          {/* Verify Token */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between text-slate-700">
              <span className="font-bold text-[11px]">Identificador de Verificación (Verify Token)</span>
              <button
                type="button"
                onClick={() => copyToClipboard(status?.metaWebhookVerifyToken || verifyToken, "token")}
                className="text-emerald-700 hover:text-emerald-800 text-[11px] font-bold flex items-center gap-1"
              >
                {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedToken ? "Copiado" : "Copiar"}</span>
              </button>
            </div>
            <p className="font-mono text-slate-900 font-bold bg-white p-2 rounded-xl border border-slate-200 text-[11px]">
              {status?.metaWebhookVerifyToken || verifyToken}
            </p>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 pt-1">
          📌 En los campos de suscripción del Webhook, suscríbete al campo <strong>messages</strong> para recibir mensajes de texto, audios y ubicaciones de clientes.
        </div>
      </div>
    </div>
  );
}
