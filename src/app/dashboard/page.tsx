import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Compass,
  Database,
  Gift,
  Globe2,
  MapPin,
  MessageSquare,
  Radio,
  ShoppingBag,
  Sparkles,
  Store,
  Users,
  Zap,
} from "lucide-react";
import {
  CRM_SECTIONS,
  type CrmSection,
} from "@/lib/dashboard/sections";

export const dynamic = "force-dynamic";

const FEATURED_HREFS = [
  "/dashboard/conversaciones",
  "/dashboard/pedidos",
  "/dashboard/clientes",
  "/dashboard/fidelidad",
  "/dashboard/catalogo",
  "/dashboard/zonas",
  "/dashboard/ia",
  "/dashboard/canales",
  "/dashboard/ajustes",
];

export default async function DashboardPage() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    ordersCount,
    pendingOrders,
    conversationsCount,
    humanTakeovers,
    customersCount,
    merchantsCount,
    zonesCount,
    ridersCount,
    messagesWeek,
    whatsappChannel,
    webChannel,
    business,
  ] = await Promise.all([
    prisma.order.count().catch(() => 0),
    prisma.order.count({ where: { status: "RECIBIDO" } }).catch(() => 0),
    prisma.conversation.count().catch(() => 0),
    prisma.conversation.count({ where: { status: "HUMAN_TAKEOVER" } }).catch(() => 0),
    prisma.customer.count().catch(() => 0),
    prisma.merchant.count({ where: { isOpen: true } }).catch(() => 0),
    prisma.deliveryZone.count({ where: { isActive: true } }).catch(() => 0),
    prisma.rider.count({ where: { isActive: true } }).catch(() => 0),
    prisma.message.count({ where: { createdAt: { gte: weekAgo } } }).catch(() => 0),
    prisma.channel.findUnique({ where: { type: "whatsapp" } }).catch(() => null),
    prisma.channel.findUnique({ where: { type: "webchat" } }).catch(() => null),
    prisma.businessProfile
      .findFirst({ select: { assistantEnabled: true } })
      .catch(() => null),
  ]);

  const isWpConnected = whatsappChannel?.status === "connected";
  const isWebConnected = webChannel?.status === "connected";
  const assistantEnabled = business?.assistantEnabled ?? true;
  const hasGroq = Boolean(process.env.GROQ_API_KEY);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const hasAI = hasGroq || hasGemini;

  const featuredModules = FEATURED_HREFS.map((href) =>
    CRM_SECTIONS.find((section) => section.href === href)
  ).filter(Boolean) as CrmSection[];

  const kpis = [
    {
      label: "Pedidos totales",
      value: ordersCount,
      hint:
        pendingOrders > 0
          ? `${pendingOrders} por confirmar en este momento`
          : "Sin pedidos pendientes de confirmar",
      icon: ShoppingBag,
      href: "/dashboard/pedidos",
      accent: "text-[#5C3470] bg-[#F3EAF7] dark:bg-[#331E39] dark:text-[#D8B8E8]",
    },
    {
      label: "Conversaciones",
      value: conversationsCount,
      hint:
        humanTakeovers > 0
          ? `${humanTakeovers} en atención humana`
          : "TropiBot está al día",
      icon: MessageSquare,
      href: "/dashboard/conversaciones",
      accent: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300",
    },
    {
      label: "Clientes registrados",
      value: customersCount,
      hint: "Con memoria, direcciones y fidelidad",
      icon: Users,
      href: "/dashboard/clientes",
      accent: "text-sky-700 bg-sky-50 dark:bg-sky-950/50 dark:text-sky-300",
    },
    {
      label: "Zonas activas",
      value: zonesCount,
      hint: "Cobertura de delivery y mototaxi",
      icon: MapPin,
      href: "/dashboard/zonas",
      accent: "text-amber-700 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-300",
    },
  ];

  const systemCards = [
    {
      title: "Base de datos",
      subtitle: "Supabase PostgreSQL",
      detail: `${merchantsCount} comercios abiertos · ${zonesCount} zonas activas`,
      icon: Database,
      active: true,
      activeLabel: "Conectada",
    },
    {
      title: "Inteligencia artificial",
      subtitle: hasGroq ? "Groq + Gemini + OpenRouter" : "Simulador local",
      detail: hasAI
        ? "Modelos listos para texto, visión y audio"
        : "Configura tus claves en AI Studio",
      icon: BrainCircuit,
      active: hasAI,
      activeLabel: hasAI ? "Activa" : "Pendiente",
    },
    {
      title: "WhatsApp Cloud API",
      subtitle: "Meta Business Platform",
      detail: isWpConnected
        ? "Canal oficial conectado y escuchando mensajes"
        : "Carga las credenciales en Canales para activarlo",
      icon: Radio,
      active: isWpConnected,
      activeLabel: isWpConnected ? "Conectado" : "Pendiente",
    },
    {
      title: "Chat web",
      subtitle: "Burbuja TropiGO",
      detail: isWebConnected
        ? "Disponible para clientes desde la web"
        : "Actívalo desde la sección Canales",
      icon: Globe2,
      active: isWebConnected,
      activeLabel: isWebConnected ? "Activo" : "Inactivo",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="crm-hero-glow relative overflow-hidden rounded-[28px] border border-white/10 bg-[#331E39] p-6 text-white shadow-xl shadow-[#331E39]/20 sm:p-8">
        <div className="crm-dot-grid pointer-events-none absolute inset-0 opacity-20" />
        <div className="relative grid items-center gap-6 lg:grid-cols-[1.35fr_0.85fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#C9A7D8]/30 bg-[#C9A7D8]/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#E6D2F0]">
                CRM privado de operaciones
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-200">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Ivirgarzama · La Paz · Bs.
              </span>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black leading-tight tracking-tight sm:text-3xl">
                Todo TropiGO, en un solo panel.
              </h1>
              <p className="max-w-xl text-xs leading-relaxed text-white/70 sm:text-sm">
                Conversaciones, pedidos, clientes, fidelidad, catálogo y tarifas
                conectados a TropiBot. Revisa qué está pasando y actúa sin saltar
                entre herramientas.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/dashboard/conversaciones"
                className="inline-flex items-center gap-2 rounded-xl bg-[#C9A7D8] px-4 py-2.5 text-xs font-black text-[#331E39] shadow-sm transition-all hover:bg-[#D8B8E8] active:scale-[0.98]"
              >
                <MessageSquare className="h-4 w-4" />
                Abrir conversaciones
              </Link>
              <Link
                href="/dashboard/guia"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-white/15"
              >
                <Compass className="h-4 w-4" />
                Guía del CRM
              </Link>
            </div>
          </div>

          {/* Estado rápido */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#C9A7D8]">
                Hoy en TropiGO
              </p>
              <Zap className="h-3.5 w-3.5 text-[#C9A7D8]" />
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-white/65">Pedidos por confirmar</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-black text-white">
                  {pendingOrders}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-white/65">Chats en atención humana</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-black text-white">
                  {humanTakeovers}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-white/65">Asistente TropiBot</span>
                <span
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    assistantEnabled
                      ? "bg-emerald-400/15 text-emerald-200"
                      : "bg-amber-400/15 text-amber-200"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      assistantEnabled ? "bg-emerald-400" : "bg-amber-400"
                    }`}
                  />
                  {assistantEnabled ? "Encendido" : "En pausa"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-white/65">WhatsApp oficial</span>
                <span
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isWpConnected
                      ? "bg-emerald-400/15 text-emerald-200"
                      : "bg-amber-400/15 text-amber-200"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isWpConnected ? "bg-emerald-400" : "bg-amber-400"
                    }`}
                  />
                  {isWpConnected ? "Conectado" : "Pendiente"}
                </span>
              </div>
            </div>
            <div className="mt-3 border-t border-white/10 pt-3">
              <p className="text-[10px] leading-relaxed text-white/45">
                {messagesWeek.toLocaleString("es-BO")} mensajes procesados en los
                últimos 7 días.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* KPIs reales */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={kpi.label}
              href={kpi.href}
              className="crm-card group p-4 transition-all hover:-translate-y-0.5 hover:border-[#C9A7D8] hover:shadow-lg hover:shadow-[#331E39]/5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${kpi.accent}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-[#B58ACB] opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-[#8E58A6] dark:text-[#C9A7D8]">
                {kpi.label}
              </p>
              <p className="mt-1 text-2xl font-black tracking-tight text-[#1E1523] dark:text-white">
                {kpi.value.toLocaleString("es-BO")}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-[#6B5A72] dark:text-slate-400">
                {kpi.hint}
              </p>
            </Link>
          );
        })}
      </section>

      {/* Flujo diario */}
      <section className="crm-card p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8E58A6] dark:text-[#C9A7D8]">
              Cómo trabaja TropiGO
            </p>
            <h2 className="mt-1 text-base font-black text-[#1E1523] dark:text-white">
              Del primer mensaje a la entrega, sin perder el hilo
            </h2>
          </div>
          <Link
            href="/dashboard/guia"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#5C3470] hover:text-[#331E39] dark:text-[#C9A7D8] dark:hover:text-white"
          >
            Ver el flujo completo
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {[
            {
              step: "01",
              title: "El cliente escribe",
              text: "Por WhatsApp oficial o chat web. TropiBot recibe texto, audio, fotos o ubicación.",
              icon: MessageSquare,
            },
            {
              step: "02",
              title: "La IA entiende y cotiza",
              text: "Consulta catálogo, zonas, tarifas y fidelidad antes de responder o crear el pedido.",
              icon: BrainCircuit,
            },
            {
              step: "03",
              title: "El equipo despacha",
              text: "Cocina confirma, se asigna repartidor y el cliente sigue el pedido en vivo.",
              icon: ShoppingBag,
            },
            {
              step: "04",
              title: "Se entrega y fideliza",
              text: "Se registra el pago, se suma el sello y se envía la encuesta post-entrega.",
              icon: Gift,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="relative rounded-2xl border border-[#EFE6F4] bg-[#FBF8FC] p-4 dark:border-white/10 dark:bg-white/[0.03]"
              >
                <span className="text-[10px] font-black tracking-[0.18em] text-[#B58ACB]">
                  PASO {item.step}
                </span>
                <div className="mt-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[#331E39] text-[#E6D2F0]">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="mt-2 text-xs font-bold text-[#1E1523] dark:text-white">
                  {item.title}
                </h3>
                <p className="mt-1 text-[10px] leading-relaxed text-[#6B5A72] dark:text-slate-400">
                  {item.text}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Módulos principales */}
      <section className="space-y-3">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8E58A6] dark:text-[#C9A7D8]">
              Guía de módulos
            </p>
            <h2 className="mt-1 text-base font-black text-[#1E1523] dark:text-white">
              ¿Qué puedes hacer en cada sección?
            </h2>
            <p className="mt-0.5 text-[11px] text-[#6B5A72] dark:text-slate-400">
              Cada tarjeta explica para qué sirve el módulo. Entra cuando lo necesites.
            </p>
          </div>
          <Link
            href="/dashboard/guia"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#5C3470] hover:text-[#331E39] dark:text-[#C9A7D8] dark:hover:text-white"
          >
            Ver todos los módulos
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {featuredModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.href}
                href={module.href}
                className="crm-card group flex flex-col p-4 transition-all hover:-translate-y-0.5 hover:border-[#C9A7D8] hover:shadow-lg hover:shadow-[#331E39]/5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3EAF7] text-[#5C3470] dark:bg-[#331E39] dark:text-[#D8B8E8]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-[#B58ACB] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-[#1E1523] dark:text-white">
                  {module.title}
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-[#6B5A72] dark:text-slate-400">
                  {module.description}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-[#8E58A6] group-hover:text-[#331E39] dark:text-[#C9A7D8] dark:group-hover:text-white">
                  Abrir sección
                  <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Estado del sistema */}
      <section className="crm-card p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8E58A6] dark:text-[#C9A7D8]">
              Salud del sistema
            </p>
            <h2 className="mt-1 text-base font-black text-[#1E1523] dark:text-white">
              Conexiones de la operación
            </h2>
          </div>
          <Link
            href="/dashboard/canales"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#5C3470] hover:text-[#331E39] dark:text-[#C9A7D8] dark:hover:text-white"
          >
            Configurar canales
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {systemCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="rounded-2xl border border-[#EFE6F4] bg-[#FBF8FC] p-4 dark:border-white/10 dark:bg-white/[0.03]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#5C3470] shadow-sm dark:bg-[#331E39] dark:text-[#D8B8E8]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                      card.active
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                    }`}
                  >
                    {card.active ? (
                      <CheckCircle2 className="h-2.5 w-2.5" />
                    ) : (
                      <Bot className="h-2.5 w-2.5" />
                    )}
                    {card.activeLabel}
                  </span>
                </div>
                <h3 className="mt-2 text-xs font-bold text-[#1E1523] dark:text-white">
                  {card.title}
                </h3>
                <p className="text-[10px] font-semibold text-[#8E58A6] dark:text-[#C9A7D8]">
                  {card.subtitle}
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-[#6B5A72] dark:text-slate-400">
                  {card.detail}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA guía */}
      <section className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-[#E0CCE9] bg-gradient-to-r from-[#F3EAF7] to-white p-5 dark:border-white/10 dark:from-[#2A1830] dark:to-[#1E1423] sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#331E39] text-[#E6D2F0]">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#1E1523] dark:text-white">
              ¿Primera vez en el CRM?
            </h3>
            <p className="mt-0.5 max-w-xl text-[11px] leading-relaxed text-[#6B5A72] dark:text-slate-400">
              La guía completa explica el flujo diario, cada módulo, el glosario y
              las buenas prácticas para operar TropiGO sin errores.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/guia"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#C9A7D8] px-4 py-2.5 text-xs font-black text-[#331E39] transition-colors hover:bg-[#D8B8E8]"
        >
          Leer la guía completa
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>

      {/* Pequeño resumen secundario */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Comercios abiertos", value: merchantsCount, icon: Store },
          { label: "Repartidores activos", value: ridersCount, icon: Zap },
          { label: "Mensajes (7 días)", value: messagesWeek, icon: MessageSquare },
          {
            label: "Asistente",
            value: assistantEnabled ? "Activo" : "Pausa",
            icon: Sparkles,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center gap-2.5 rounded-xl border border-[#EFE6F4] bg-white/70 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.03]"
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-[#8E58A6] dark:text-[#C9A7D8]" />
              <div className="min-w-0">
                <p className="truncate text-[9px] font-bold uppercase tracking-wider text-[#8E58A6] dark:text-[#C9A7D8]">
                  {item.label}
                </p>
                <p className="text-sm font-black text-[#1E1523] dark:text-white">
                  {typeof item.value === "number"
                    ? item.value.toLocaleString("es-BO")
                    : item.value}
                </p>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
