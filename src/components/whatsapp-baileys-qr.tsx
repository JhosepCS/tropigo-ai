"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  QrCode,
  RefreshCw,
  ShieldAlert,
  Smartphone,
  WifiOff,
} from "lucide-react";

interface WhatsAppBaileysQrProps {
  initialStatus?: string;
  initialQrCode?: string | null;
  initialPhone?: string | null;
  metaActive?: boolean;
}

interface BaileysState {
  status: string;
  phone: string | null;
  qrCode: string | null;
}

const STATUS_TEXT: Record<string, string> = {
  connected: "WhatsApp conectado",
  scanning_qr: "Esperando que escanees el QR",
  disconnected: "Worker desconectado",
  logged_out: "Sesión cerrada",
};

export function WhatsAppBaileysQr({
  initialStatus,
  initialQrCode,
  initialPhone,
  metaActive = false,
}: WhatsAppBaileysQrProps) {
  const [state, setState] = useState<BaileysState>({
    status: initialStatus || "disconnected",
    phone: initialPhone || null,
    qrCode: initialQrCode || null,
  });
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (metaActive) return;

    const source = new EventSource("/api/channels/whatsapp/sse");

    source.onopen = () => setLive(true);
    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as Partial<BaileysState>;
        setState({
          status: data.status || "disconnected",
          phone: data.phone || null,
          qrCode: data.qrCode || null,
        });
      } catch {
        // Ignorar mensajes SSE incompletos.
      }
    };
    source.onerror = () => setLive(false);

    return () => source.close();
  }, [metaActive]);

  const isConnected = state.status === "connected";
  const hasQr = Boolean(state.qrCode);

  if (metaActive) {
    return (
      <div className="bg-white rounded-3xl border border-[#EAECF0] p-6 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#101828]">
              Modo oficial de Meta activo
            </h3>
            <p className="text-xs text-[#667085] mt-1">
              El canal está usando WhatsApp Business Cloud API. El QR de Baileys
              no se muestra porque no es necesario y podría entrar en conflicto
              con el número oficial.
            </p>
            <p className="text-[11px] text-[#667085] mt-2">
              Si algún día quieres probar el modo no oficial, cambia
              <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px]">
                WHATSAPP_PROVIDER=BAILEYS_QR
              </code>
              en Render y redespliega el worker.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-[#EAECF0] p-6 shadow-2xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#EAECF0]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
            <QrCode className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-[#101828]">
                Modo QR (Baileys)
              </h3>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                NO OFICIAL
              </span>
            </div>
            <p className="text-xs text-[#667085]">
              Solo para pruebas con un número desechable. No uses tu WhatsApp
              personal.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-semibold">
          <span
            className={`inline-flex h-2 w-2 rounded-full ${
              live ? "bg-emerald-500" : "bg-slate-300"
            }`}
          />
          <span className={live ? "text-emerald-700" : "text-slate-500"}>
            {live ? "En vivo" : "Sin conexión SSE"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 min-h-[290px]">
          {hasQr ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={state.qrCode || ""}
                alt="Código QR para vincular WhatsApp"
                className="w-64 h-64 rounded-xl bg-white p-2 shadow-sm"
              />
              <p className="mt-3 text-center text-[11px] text-slate-600">
                El QR cambia cada pocos segundos. Escanéalo desde WhatsApp →
                Dispositivos vinculados.
              </p>
            </>
          ) : isConnected ? (
            <div className="text-center space-y-2">
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
              <p className="font-bold text-sm text-emerald-800">
                WhatsApp conectado
              </p>
              <p className="text-xs text-slate-600">
                {state.phone || "Número vinculado correctamente"}
              </p>
            </div>
          ) : (
            <div className="text-center space-y-2">
              <WifiOff className="mx-auto h-14 w-14 text-slate-400" />
              <p className="font-bold text-sm text-slate-700">
                {STATUS_TEXT[state.status] || "Sin QR disponible"}
              </p>
              <p className="text-xs text-slate-500 max-w-xs">
                El worker aún no generó un código. Si está dormido en Render,
                despiértalo y espera unos segundos.
              </p>
            </div>
          )}
        </div>

        <div className="lg:col-span-7 space-y-4 text-xs">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <p className="text-[11px] leading-relaxed text-amber-900">
                <strong>Advertencia:</strong> este modo vincula tu WhatsApp
                normal como un dispositivo más. WhatsApp puede bloquear el
                número por uso automatizado. Para producción usa Meta Cloud API.
              </p>
            </div>
          </div>

          <ol className="space-y-2 text-[11px] text-slate-700">
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                1
              </span>
              <span>
                Abre el worker en Render o ejecuta{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px]">
                  npm run start:worker
                </code>{" "}
                en tu PC.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                2
              </span>
              <span>Espera a que aparezca el QR en esta tarjeta.</span>
            </li>
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                3
              </span>
              <span>
                En el teléfono: WhatsApp → Ajustes → Dispositivos vinculados →
                Vincular un dispositivo.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                4
              </span>
              <span>Escanea el QR. El estado cambiará a “conectado”.</span>
            </li>
          </ol>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <a
              href="https://dashboard.render.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir Render
            </a>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Recargar estado
            </button>
            {isConnected && (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-800">
                <Smartphone className="h-3.5 w-3.5" />
                {state.phone || "Sesión activa"}
              </span>
            )}
          </div>

          <p className="flex items-start gap-1.5 text-[10px] text-slate-500">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            La sesión se guarda en Supabase. Si el worker se reinicia, debería
            reconectar sin pedir otro QR.
          </p>
        </div>
      </div>
    </div>
  );
}
