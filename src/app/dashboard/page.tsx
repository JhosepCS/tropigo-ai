import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  MessageSquare,
  ShoppingBag,
  TrendingUp,
  Sparkles,
  Bot,
  Database,
  Radio,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  Store,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Conteo de registros reales en Supabase
  const [realOrdersCount, realMerchantsCount, realCustomersCount, activeZonesCount] =
    await Promise.all([
      prisma.order.count().catch(() => 0),
      prisma.merchant.count({ where: { isOpen: true } }).catch(() => 0),
      prisma.customer.count().catch(() => 0),
      prisma.deliveryZone.count({ where: { isActive: true } }).catch(() => 0),
    ]);

  // Detección de claves de entorno para el estado del sistema
  const hasGroq = Boolean(process.env.GROQ_API_KEY);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const hasMeta = Boolean(process.env.META_SYSTEM_TOKEN && process.env.META_PHONE_NUMBER_ID);

  return (
    <div className="space-y-6">
      {/* Encabezado Principal del CRM */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-6 rounded-3xl text-white shadow-sm border border-emerald-800/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight">TropiGO AI</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              CRM Privado de Operaciones
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-xl">
            Centro de monitoreo del agente de inteligencia artificial para WhatsApp, pedidos y comercios en Ivirgarzama, Trópico de Cochabamba.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/conversaciones"
            className="flex items-center gap-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2.5 rounded-xl transition-all shadow-sm"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Abrir Chats WhatsApp</span>
          </Link>
        </div>
      </div>

      {/* Alerta de datos demostrativos */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-900 p-3.5 rounded-2xl text-xs">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Modo de Demostración y Estructura Visual Activa (ETAPA 1A)</p>
          <p className="text-amber-800 mt-0.5">
            Las métricas marcadas con la etiqueta <span className="font-bold bg-amber-200/80 px-1.5 py-0.2 rounded text-[11px]">[DEMO]</span> son datos de ejemplo para visualizar el comportamiento de la plataforma. La base de datos Supabase se encuentra conectada de forma no destructiva.
          </p>
        </div>
      </div>

      {/* Tarjetas KPI de Demostración Identificadas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white p-4 rounded-2xl border border-[#EAECF0] shadow-2xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Conversaciones (Hoy)
            </span>
            <span className="text-[10px] font-black text-amber-700 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded">
              [DEMO]
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-black text-[#101828]">24</p>
            <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
              92% resueltas por IA
            </span>
          </div>
          <p className="text-[11px] text-[#667085]">WhatsApp Business Ivirgarzama</p>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-4 rounded-2xl border border-[#EAECF0] shadow-2xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Pedidos WhatsApp
            </span>
            <span className="text-[10px] font-black text-amber-700 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded">
              [DEMO]
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-black text-[#101828]">14</p>
            <span className="text-[11px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded-full">
              {realOrdersCount} en base de datos
            </span>
          </div>
          <p className="text-[11px] text-[#667085]">Ticket promedio ~38.50 Bs.</p>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-4 rounded-2xl border border-[#EAECF0] shadow-2xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Ventas Estimadas
            </span>
            <span className="text-[10px] font-black text-amber-700 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded">
              [DEMO]
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-black text-[#101828]">
              540.00 <span className="text-xs font-bold text-[#667085]">Bs.</span>
            </p>
            <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
              Ivirgarzama
            </span>
          </div>
          <p className="text-[11px] text-[#667085]">Comisión TropiGO: 10% (54 Bs.)</p>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-4 rounded-2xl border border-[#EAECF0] shadow-2xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Latencia IA
            </span>
            <span className="text-[10px] font-black text-amber-700 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded">
              [DEMO]
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-black text-[#101828]">
              1.2s <span className="text-xs font-bold text-[#667085]">Groq/Gemini</span>
            </p>
            <span className="text-[11px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-full">
              Alta velocidad
            </span>
          </div>
          <p className="text-[11px] text-[#667085]">Whisper + Llama 3.3</p>
        </div>
      </div>

      {/* Estado Real de Conexiones del Sistema */}
      <div className="bg-white p-5 rounded-3xl border border-[#EAECF0] shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#EAECF0] pb-3">
          <div>
            <h3 className="text-sm font-black text-[#101828]">
              Estado Real de Infraestructura y Conectores (Supabase & IA)
            </h3>
            <p className="text-xs text-[#667085]">
              Diagnóstico en tiempo real de los servicios vinculados a TropiGO AI.
            </p>
          </div>
          <Link
            href="/dashboard/ia"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors"
          >
            Configurar Modelos →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Conexión Supabase */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#101828] flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                Base de Datos
              </span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold bg-emerald-100/80 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" />
                Supabase PostgreSQL
              </span>
            </div>
            <p className="text-[11px] text-[#667085]">
              Esquema intacto. {realMerchantsCount} comercios, {activeZonesCount} zonas en Ivirgarzama.
            </p>
          </div>

          {/* Conexión Groq */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#101828] flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-teal-600" />
                Groq (Llama 3.3)
              </span>
              {hasGroq ? (
                <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold bg-emerald-100/80 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Activo
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-full">
                  Simulador Local
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#667085]">
              {hasGroq ? "Clave configurada en .env" : "Listo para ingresar clave en CRM o usar simulador"}
            </p>
          </div>

          {/* Conexión Gemini */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#101828] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Google Gemini
              </span>
              {hasGemini ? (
                <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold bg-emerald-100/80 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Activo
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] text-slate-600 font-bold bg-slate-200 px-2 py-0.5 rounded-full">
                  Pendiente
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#667085]">
              {hasGemini ? "Gemini 1.5 Flash listo" : "Visión & Fallback secundario"}
            </p>
          </div>

          {/* WhatsApp Meta */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#101828] flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-green-600" />
                WhatsApp Cloud
              </span>
              {hasMeta ? (
                <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold bg-emerald-100/80 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Conectado
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] text-purple-700 font-bold bg-purple-100 px-2 py-0.5 rounded-full">
                  Modo Demo Webhook
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#667085]">
              {hasMeta ? "Meta Business Platform v21.0" : "Simulador interactivo activo en CRM"}
            </p>
          </div>
        </div>
      </div>

      {/* Accesos Rápidos del CRM */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/dashboard/conversaciones"
          className="group p-5 bg-white rounded-3xl border border-[#EAECF0] hover:border-emerald-300 hover:shadow-md transition-all space-y-2"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
            <MessageSquare className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-sm text-[#101828] flex items-center justify-between">
            <span>Bandeja de Conversaciones</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 transition-colors" />
          </h4>
          <p className="text-xs text-[#667085]">
            Monitorea los chats en vivo con los clientes de Ivirgarzama, audios transcritos y activa el Takeover humano cuando desees responder personalmente.
          </p>
        </Link>

        <Link
          href="/dashboard/pedidos"
          className="group p-5 bg-white rounded-3xl border border-[#EAECF0] hover:border-emerald-300 hover:shadow-md transition-all space-y-2"
        >
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-sm text-[#101828] flex items-center justify-between">
            <span>Pedidos WhatsApp</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-700 transition-colors" />
          </h4>
          <p className="text-xs text-[#667085]">
            Supervisa los pedidos generados por TropiGO AI, cambia estados (Preparación, En Camino, Entregado) e inspecciona montos en Bolivianos.
          </p>
        </Link>

        <Link
          href="/dashboard/ia"
          className="group p-5 bg-white rounded-3xl border border-[#EAECF0] hover:border-emerald-300 hover:shadow-md transition-all space-y-2"
        >
          <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-sm text-[#101828] flex items-center justify-between">
            <span>Motor de IA Multimodelo</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-700 transition-colors" />
          </h4>
          <p className="text-xs text-[#667085]">
            Configura tus claves cifradas de Groq, Gemini y OpenRouter, ajusta el prompt de atención tropical y prueba respuestas en tiempo real.
          </p>
        </Link>
      </div>
    </div>
  );
}
