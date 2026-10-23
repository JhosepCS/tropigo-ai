import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  MessageSquare,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
  Blocks,
  Radio,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ResumenPage() {
  const business = await prisma.businessProfile.findFirst();
  const integrations = await prisma.integration.findMany();
  const wpChannel = await prisma.channel.findUnique({ where: { type: "whatsapp" } });
  const webChannel = await prisma.channel.findUnique({ where: { type: "webchat" } });

  // Métricas
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  const totalConversationsToday = await prisma.conversation.count({
    where: { createdAt: { gte: todayStart } },
  });

  const totalConversationsWeek = await prisma.conversation.count({
    where: { createdAt: { gte: weekStart } },
  });

  const appointmentsCreated = await prisma.appointment.count();
  const waitingHuman = await prisma.conversation.count({
    where: { status: "human_takeover" },
  });

  const recentActivity = await prisma.activityLog.findMany({
    take: 6,
    orderBy: { createdAt: "desc" },
  });

  const isWpConnected = wpChannel?.status === "connected";
  const isWebConnected = webChannel?.status === "connected";

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div>
        <h2 className="text-2xl font-bold text-[#101828]">Resumen del Negocio</h2>
        <p className="text-sm text-[#475467]">
          Estado operativo de {business?.name || "Clínica Dental Lumen"}, canales de atención e integraciones activas.
        </p>
      </div>

      {/* Grid de Métricas Principales (Untitled UI) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#EAECF0] shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">
              Conversaciones Hoy
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold text-[#101828]">{totalConversationsToday || 3}</p>
            <span className="text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
              {totalConversationsWeek || 14} esta semana
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#EAECF0] shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">
              Citas Creadas por IA
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold text-purple-700">{appointmentsCreated || 1}</p>
            <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
              Google Calendar
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#EAECF0] shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">
              Esperan a una Persona
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold text-amber-700">{waitingHuman}</p>
            <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              Pase inmediato
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#EAECF0] shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">
              Tiempo Medio Respuesta
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold text-[#101828]">8 seg</p>
            <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              Buffer WhatsApp
            </span>
          </div>
        </div>
      </div>

      {/* Estado de Canales e Integraciones */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Canales Activos */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-[#EAECF0] shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#EAECF0]">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-teal-600" />
              <h3 className="font-semibold text-sm text-[#101828]">Estado de Canales</h3>
            </div>
            <Link
              href="/dashboard/canales"
              className="text-xs font-medium text-teal-700 hover:underline flex items-center gap-1"
            >
              <span>Gestionar</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#EAECF0] bg-[#FAFAFA]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                  WA
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-[#101828]">WhatsApp (Baileys QR)</h4>
                  <p className="text-[11px] text-[#667085]">
                    {isWpConnected ? wpChannel?.phone || "Conectado" : "Esperando escaneo de código QR"}
                  </p>
                </div>
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                  isWpConnected
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-gray-100 text-[#475467] border-[#EAECF0]"
                }`}
              >
                {isWpConnected ? "Conectado" : "Desconectado"}
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#EAECF0] bg-[#FAFAFA]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">
                  WEB
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-[#101828]">Chat para tu Web</h4>
                  <p className="text-[11px] text-[#667085]">
                    Widget embebible con demo en /demo
                  </p>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">
                Activo
              </span>
            </div>
          </div>
        </div>

        {/* Integraciones Conectadas */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-[#EAECF0] shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#EAECF0]">
            <div className="flex items-center gap-2">
              <Blocks className="w-4 h-4 text-purple-600" />
              <h3 className="font-semibold text-sm text-[#101828]">Integraciones</h3>
            </div>
            <Link
              href="/dashboard/integraciones"
              className="text-xs font-medium text-teal-700 hover:underline flex items-center gap-1"
            >
              <span>Ver catálogo completo</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {integracionesInfo.map((intg) => {
              const dbInt = integrations.find((i) => i.provider === intg.provider);
              const isConnected = dbInt?.status === "connected";
              const isError = dbInt?.status === "error";

              return (
                <div
                  key={intg.provider}
                  className="p-3 rounded-xl border border-[#EAECF0] bg-[#FAFAFA] flex flex-col justify-between space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{intg.icon}</span>
                    <span className="font-semibold text-xs text-[#101828] truncate">
                      {intg.name}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium border w-fit ${
                      isConnected
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : isError
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-gray-100 text-[#667085] border-[#EAECF0]"
                    }`}
                  >
                    {isConnected ? "Conectada" : isError ? "Error" : "Sin conectar"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Últimas Acciones del Asistente */}
      <div className="bg-white p-6 rounded-2xl border border-[#EAECF0] shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#EAECF0]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <h3 className="font-semibold text-sm text-[#101828]">
              Últimas Acciones del Asistente e Integraciones
            </h3>
          </div>
          <Link
            href="/dashboard/actividad"
            className="text-xs font-medium text-teal-700 hover:underline flex items-center gap-1"
          >
            <span>Ver todo el registro</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="divide-y divide-[#EAECF0]">
          {recentActivity.map((act) => (
            <div key={act.id} className="py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-teal-500" />
                <div>
                  <p className="font-semibold text-[#101828]">{act.action}</p>
                  <p className="text-[11px] text-[#667085]">
                    Proveedor: {act.provider} • Canal: {act.channel}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                    act.status === "simulated"
                      ? "bg-purple-50 text-purple-700 border-purple-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  {act.status === "simulated" ? "Modo Seguro (Simulado)" : "Completado"}
                </span>
                <p className="text-[10px] text-[#98A2B3] mt-0.5">
                  {new Date(act.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const integracionesInfo = [
  { provider: "google_calendar", name: "Google Calendar", icon: "📅" },
  { provider: "gmail", name: "Gmail", icon: "✉️" },
  { provider: "google_sheets", name: "Google Sheets", icon: "📊" },
  { provider: "slack", name: "Slack", icon: "💬" },
  { provider: "stripe", name: "Stripe", icon: "💳" },
  { provider: "webhooks", name: "Webhooks", icon: "⚡" },
];
