import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Compass,
  Gift,
  HelpCircle,
  Lightbulb,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import {
  CRM_GROUPS,
  CRM_SECTIONS,
  getSectionsByGroup,
} from "@/lib/dashboard/sections";

export const metadata: Metadata = {
  title: "Guía del CRM | TropiGO AI",
  description:
    "Manual de uso del CRM de TropiGO AI: flujo diario, módulos, glosario y buenas prácticas.",
};

const DAILY_FLOW = [
  {
    title: "Revisa el panel",
    text: "Mira pedidos pendientes, chats en atención humana y el estado de WhatsApp e IA.",
    icon: Zap,
  },
  {
    title: "Atiende conversaciones",
    text: "Entra a la bandeja, revisa los chats y toma el control solo cuando sea necesario.",
    icon: MessageSquare,
  },
  {
    title: "Gestiona pedidos",
    text: "Confirma, prepara, asigna repartidor y marca la entrega. El sello se suma solo.",
    icon: Gift,
  },
  {
    title: "Revisa la IA",
    text: "Consulta tokens, latencia y errores en AI Studio. Ajusta el prompt si algo falla.",
    icon: BrainCircuit,
  },
  {
    title: "Actualiza el negocio",
    text: "Mantén catálogo, precios, zonas y horarios al día para que la IA cotice bien.",
    icon: MapPin,
  },
];

const GLOSSARY = [
  {
    term: "Takeover humano",
    definition:
      "Cuando un operador toma el control de una conversación y TropiBot deja de responder hasta que se la devuelvan.",
    icon: Users,
  },
  {
    term: "Sello de fidelidad",
    definition:
      "Marca que suma un pedido entregado o una carrera finalizada. Con 10 sellos, el pedido 10 es gratis.",
    icon: Gift,
  },
  {
    term: "Zona de cobertura",
    definition:
      "Área con tarifa base de delivery y mototaxi. El recargo por km se calcula desde la Plaza Principal.",
    icon: MapPin,
  },
  {
    term: "ETA",
    definition:
      "Tiempo estimado de llegada. Se calcula con la distancia y el tiempo configurado para la zona.",
    icon: Clock,
  },
  {
    term: "WABA",
    definition:
      "WhatsApp Business Account. Es la cuenta empresarial de Meta que agrupa números y plantillas.",
    icon: MessageSquare,
  },
  {
    term: "Token de IA",
    definition:
      "Unidad de texto que consume un modelo. AI Studio muestra el consumo total y por modelo.",
    icon: Sparkles,
  },
  {
    term: "Webhook",
    definition:
      "URL de TropiGO que recibe los mensajes de Meta. Debe estar verificada para que lleguen los chats.",
    icon: ShieldCheck,
  },
  {
    term: "Opt-out",
    definition:
      "Solicitud del cliente para no recibir más mensajes. Se registra en su ficha y la IA debe respetarla.",
    icon: Users,
  },
];

const FAQS = [
  {
    question: "¿Por dónde empiezo si es mi primer día?",
    answer:
      "Lee el flujo diario de esta guía, abre el Panel Principal y revisa el estado de WhatsApp e IA. Luego entra a Conversaciones para ver los chats activos y a Pedidos para confirmar los que estén en RECIBIDO.",
  },
  {
    question: "¿Cómo conecto el WhatsApp oficial de Meta?",
    answer:
      "Ve a Canales → Credenciales Oficiales Cloud API. Carga el Phone Number ID, WABA ID, token de System User y App Secret. Verifica el webhook en /api/channels/whatsapp/webhook y prueba el estado de la conexión.",
  },
  {
    question: "¿Cómo cambio las tarifas de delivery o mototaxi?",
    answer:
      "En Zonas & Tarifas puedes editar la tarifa base de cada zona, los minutos estimados y el recargo por km. El centro de cálculo se configura en Ajustes y debe ser la Plaza Principal de Ivirgarzama.",
  },
  {
    question: "¿Dónde veo cuántos tokens consume la IA?",
    answer:
      "En AI Studio → pestaña Métricas. Ahí aparecen tokens totales de los últimos 7 días, tokens por modelo, latencia promedio y cantidad de mensajes.",
  },
  {
    question: "¿Cómo pruebo un cambio sin afectar a los clientes?",
    answer:
      "Usa el Simulador. Escribe como si fueras un cliente y observa qué herramientas ejecuta la IA. Cuando el resultado sea correcto, el cambio ya está activo para los mensajes nuevos.",
  },
  {
    question: "¿Qué pasa si un pedido se cancela?",
    answer:
      "El sistema restaura los sellos reservados y libera el premio de fidelidad. Revisa el historial del pedido en Pedidos para confirmar el estado final.",
  },
];

const BEST_PRACTICES = [
  {
    title: "Una sola fuente de verdad",
    text: "Actualiza precios, horarios y disponibilidad en el CRM, no en mensajes sueltos. La IA responde con lo que ve en la base de datos.",
    icon: CheckCircle2,
  },
  {
    title: "Toma el control con criterio",
    text: "Usa el Takeover humano para casos delicados, reclamos o clientes que piden hablar con una persona. Devuelve el chat a la IA al terminar.",
    icon: Users,
  },
  {
    title: "Revisa las métricas cada semana",
    text: "Tokens, latencia y errores te dicen si el modelo o el prompt necesitan ajustes antes de que el cliente lo note.",
    icon: Sparkles,
  },
  {
    title: "Protege las credenciales",
    text: "No compartas tokens de Meta ni claves de IA. Cámbialas si sospechas que se filtraron y revisa los usuarios con acceso.",
    icon: ShieldCheck,
  },
];

export default function GuiaPage() {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="crm-hero-glow relative overflow-hidden rounded-[28px] border border-white/10 bg-[#331E39] p-6 text-white shadow-xl shadow-[#331E39]/20 sm:p-8">
        <div className="crm-dot-grid pointer-events-none absolute inset-0 opacity-20" />
        <div className="relative grid items-center gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#C9A7D8]/30 bg-[#C9A7D8]/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#E6D2F0]">
                Manual de operación
              </span>
              <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/70">
                {CRM_SECTIONS.length} módulos explicados
              </span>
            </div>
            <h1 className="text-2xl font-black leading-tight tracking-tight sm:text-3xl">
              Guía del CRM TropiGO AI
            </h1>
            <p className="max-w-2xl text-xs leading-relaxed text-white/70 sm:text-sm">
              Aprende qué hace cada sección, en qué orden usarla y cómo evitar los
              errores más comunes. Esta guía está pensada para operadores,
              administradores y cualquier persona que atienda el día a día de
              TropiGO en Ivirgarzama.
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-[#C9A7D8] px-4 py-2.5 text-xs font-black text-[#331E39] transition-colors hover:bg-[#D8B8E8]"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al panel
              </Link>
              <Link
                href="/dashboard/probar"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-white/15"
              >
                <Sparkles className="h-4 w-4" />
                Probar a TropiBot
              </Link>
            </div>
          </div>

          <div className="hidden rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm lg:block">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-[#C9A7D8]">
              Lo que encontrarás
            </p>
            <div className="space-y-3">
              {[
                { icon: BookOpen, value: `${CRM_SECTIONS.length}`, label: "módulos explicados" },
                { icon: Compass, value: `${CRM_GROUPS.length}`, label: "grupos de trabajo" },
                { icon: Clock, value: "5", label: "pasos en la rutina diaria" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C9A7D8]/15 text-[#E6D2F0]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-lg font-black leading-none text-white">
                        {item.value}
                      </p>
                      <p className="text-[10px] text-white/55">{item.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Flujo diario */}
      <section className="crm-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#331E39] text-[#E6D2F0]">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8E58A6] dark:text-[#C9A7D8]">
              Rutina recomendada
            </p>
            <h2 className="mt-1 text-base font-black text-[#1E1523] dark:text-white">
              El flujo diario en 5 pasos
            </h2>
            <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-[#6B5A72] dark:text-slate-400">
              No necesitas recorrer todo el CRM cada hora. Con esta secuencia cubres
              lo importante sin perder tiempo.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-5">
          {DAILY_FLOW.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="relative rounded-2xl border border-[#EFE6F4] bg-[#FBF8FC] p-4 dark:border-white/10 dark:bg-white/[0.03]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black tracking-[0.18em] text-[#B58ACB]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <Icon className="h-4 w-4 text-[#8E58A6] dark:text-[#C9A7D8]" />
                </div>
                <h3 className="mt-2 text-xs font-bold text-[#1E1523] dark:text-white">
                  {step.title}
                </h3>
                <p className="mt-1 text-[10px] leading-relaxed text-[#6B5A72] dark:text-slate-400">
                  {step.text}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Mapa de módulos */}
      <section className="space-y-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8E58A6] dark:text-[#C9A7D8]">
            Mapa completo
          </p>
          <h2 className="mt-1 text-base font-black text-[#1E1523] dark:text-white">
            ¿Qué hace cada módulo?
          </h2>
          <p className="mt-0.5 max-w-2xl text-[11px] leading-relaxed text-[#6B5A72] dark:text-slate-400">
            Cada tarjeta resume el propósito del módulo, los pasos recomendados y un
            consejo práctico. Usa el enlace para entrar directamente.
          </p>
        </div>

        {CRM_GROUPS.map((group) => {
          const sections = getSectionsByGroup(group);
          return (
            <div key={group} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#8E58A6]" />
                <h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-[#5C3470] dark:text-[#C9A7D8]">
                  {group}
                </h3>
                <span className="text-[10px] font-semibold text-[#B58ACB]">
                  {sections.length} módulos
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <div
                      key={section.href}
                      className="crm-card flex flex-col p-4 transition-colors hover:border-[#C9A7D8]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3EAF7] text-[#5C3470] dark:bg-[#331E39] dark:text-[#D8B8E8]">
                          <Icon className="h-4 w-4" />
                        </div>
                        <Link
                          href={section.href}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#E0CCE9] bg-[#FBF8FC] px-2 py-1 text-[9px] font-bold text-[#5C3470] transition-colors hover:border-[#C9A7D8] hover:bg-[#F3EAF7] dark:border-white/10 dark:bg-white/[0.05] dark:text-[#D8B8E8]"
                        >
                          Abrir
                          <ArrowRight className="h-2.5 w-2.5" />
                        </Link>
                      </div>

                      <h4 className="mt-2.5 text-sm font-bold text-[#1E1523] dark:text-white">
                        {section.title}
                      </h4>
                      <p className="mt-1 text-[11px] leading-relaxed text-[#6B5A72] dark:text-slate-400">
                        {section.description}
                      </p>

                      <div className="mt-3 rounded-xl border border-[#F0E6F4] bg-[#FBF8FC] p-2.5 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[8px] font-black uppercase tracking-[0.16em] text-[#8E58A6] dark:text-[#C9A7D8]">
                          Pasos recomendados
                        </p>
                        <ul className="mt-1.5 space-y-1">
                          {section.steps.map((step, index) => (
                            <li
                              key={step}
                              className="flex items-start gap-1.5 text-[10px] leading-relaxed text-[#4A3A50] dark:text-slate-300"
                            >
                              <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[#331E39] text-[8px] font-black text-white">
                                {index + 1}
                              </span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-2.5 flex items-start gap-1.5 rounded-lg bg-[#F3EAF7]/60 p-2 dark:bg-[#331E39]/40">
                        <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-[#8E58A6] dark:text-[#C9A7D8]" />
                        <p className="text-[9px] leading-relaxed text-[#5C3470] dark:text-[#D8B8E8]">
                          {section.tip}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      {/* Glosario */}
      <section className="crm-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#331E39] text-[#E6D2F0]">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8E58A6] dark:text-[#C9A7D8]">
              Glosario
            </p>
            <h2 className="mt-1 text-base font-black text-[#1E1523] dark:text-white">
              Términos que vas a ver todos los días
            </h2>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {GLOSSARY.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.term}
                className="rounded-2xl border border-[#EFE6F4] bg-[#FBF8FC] p-3.5 dark:border-white/10 dark:bg-white/[0.03]"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-[#8E58A6] dark:text-[#C9A7D8]" />
                  <h3 className="text-[11px] font-bold text-[#1E1523] dark:text-white">
                    {item.term}
                  </h3>
                </div>
                <p className="mt-1.5 text-[10px] leading-relaxed text-[#6B5A72] dark:text-slate-400">
                  {item.definition}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Buenas prácticas */}
      <section className="space-y-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8E58A6] dark:text-[#C9A7D8]">
            Operación sana
          </p>
          <h2 className="mt-1 text-base font-black text-[#1E1523] dark:text-white">
            Buenas prácticas
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {BEST_PRACTICES.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="crm-card p-4"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3EAF7] text-[#5C3470] dark:bg-[#331E39] dark:text-[#D8B8E8]">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="mt-2.5 text-xs font-bold text-[#1E1523] dark:text-white">
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

      {/* FAQ */}
      <section className="crm-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#331E39] text-[#E6D2F0]">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8E58A6] dark:text-[#C9A7D8]">
              Preguntas frecuentes
            </p>
            <h2 className="mt-1 text-base font-black text-[#1E1523] dark:text-white">
              Dudas rápidas de operación
            </h2>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {FAQS.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-xl border border-[#EFE6F4] bg-[#FBF8FC] px-4 py-3 open:border-[#C9A7D8] dark:border-white/10 dark:bg-white/[0.03]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[11px] font-bold text-[#1E1523] dark:text-white">
                {faq.question}
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#8E58A6] transition-transform group-open:rotate-90 dark:text-[#C9A7D8]" />
              </summary>
              <p className="mt-2 border-t border-[#F0E6F4] pt-2 text-[10px] leading-relaxed text-[#6B5A72] dark:border-white/10 dark:text-slate-400">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-[#E0CCE9] bg-gradient-to-r from-[#331E39] to-[#482957] p-5 text-white sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#E6D2F0]">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black">¿Listo para operar?</h3>
            <p className="mt-0.5 max-w-xl text-[11px] leading-relaxed text-white/65">
              Vuelve al panel, revisa el estado de la operación y empieza por los
              pedidos o conversaciones que necesitan atención ahora.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#C9A7D8] px-4 py-2.5 text-xs font-black text-[#331E39] transition-colors hover:bg-[#D8B8E8]"
        >
          Ir al Panel Principal
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>
    </div>
  );
}
