import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { DemoChatBubble } from "./demo-chat-bubble";
import { Sparkles, Phone, MapPin, Clock, ArrowLeft, Star, ShieldCheck, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DemoPage() {
  const business = await prisma.businessProfile.findFirst();
  const services = await prisma.service.findMany({ where: { isActive: true }, take: 6 });
  const webChannel = await prisma.channel.findUnique({ where: { type: "webchat" } });

  let settings = {
    enabled: true,
    primaryColor: "#0F766E",
    welcomeMessage: "¡Hola! 👋 Soy el asistente de Clínica Dental Lumen. ¿Quieres pedir cita o tienes alguna consulta?",
  };

  try {
    if (webChannel?.settingsJson) {
      settings = { ...settings, ...JSON.parse(webChannel.settingsJson) };
    }
  } catch (e) {}

  return (
    <div className="min-h-screen bg-white text-[#101828] flex flex-col font-sans selection:bg-teal-100 selection:text-teal-900">
      {/* Banner Superior con acceso al panel */}
      <div className="bg-[#101828] text-white py-2 px-6 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Web de demostración con la burbuja de chat de <strong>Atiende</strong> activa.</span>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-1 font-semibold text-teal-400 hover:text-teal-300 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al panel</span>
        </Link>
      </div>

      {/* Header Clínica Dental Lumen */}
      <header className="border-b border-[#EAECF0] py-4 px-8 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xs z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-700 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            L
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-[#101828]">
              {business?.name || "Clínica Dental Lumen"}
            </h1>
            <p className="text-[11px] text-[#667085]">Odontología Avanzada • Gran Vía, Madrid</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6 text-xs font-medium text-[#475467]">
          <span>Tratamientos</span>
          <span>Equipo Médico</span>
          <span>Tecnología 3D</span>
          <span>Financiación</span>
          <div className="flex items-center gap-2 font-bold text-teal-800 bg-teal-50 px-3 py-1.5 rounded-full border border-teal-200">
            <Phone className="w-3.5 h-3.5" />
            <span>912 345 678</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-8 max-w-6xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full text-xs font-semibold text-teal-800">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span>4.9 / 5 estrellas en más de 850 valoraciones de Google</span>
        </div>

        <h2 className="text-4xl sm:text-5xl font-black text-[#101828] tracking-tight max-w-3xl mx-auto leading-tight">
          Tu sonrisa en las mejores manos en el corazón de Madrid.
        </h2>

        <p className="text-base text-[#475467] max-w-2xl mx-auto leading-relaxed">
          Especialistas en ortodoncia invisible, implantes guiados por ordenador y estética dental. Primera visita y radiografía panorámica gratuita.
        </p>

        <div className="pt-4 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold">
          <button
            id="pedir-cita-hero"
            className="bg-teal-700 hover:bg-teal-800 text-white px-6 py-3 rounded-2xl shadow-md transition-all flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Pedir cita con el Asistente de IA</span>
          </button>
          <div className="flex items-center gap-2 text-[#667085]">
            <Clock className="w-4 h-4 text-teal-600" />
            <span>L-V: 09:00 - 14:00 y 16:00 - 20:00</span>
          </div>
        </div>
      </section>

      {/* Grid de Servicios */}
      <section className="py-16 px-8 bg-[#F9FAFB] border-t border-b border-[#EAECF0]">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-bold text-[#101828]">Nuestros Tratamientos Destacados</h3>
            <p className="text-xs text-[#667085]">
              Precios transparentes y tecnología de vanguardia sin molestias.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {services.map((s) => (
              <div
                key={s.id}
                className="bg-white p-6 rounded-2xl border border-[#EAECF0] shadow-2xs space-y-3"
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-sm text-[#101828]">{s.name}</h4>
                  <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                    {s.price === 0 ? "Gratuito" : `Desde ${s.price} €`}
                  </span>
                </div>
                <p className="text-xs text-[#475467] leading-relaxed line-clamp-2">
                  {s.description}
                </p>
                <div className="pt-2 text-[11px] text-[#667085] flex items-center gap-1.5 border-t border-[#EAECF0]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                  <span>Duración: ~{s.durationMinutes} minutos</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-8 text-center text-xs text-[#667085] space-y-2">
        <p><strong>Clínica Dental Lumen</strong> — Calle Gran Vía 42, 2º Izquierda, 28013 Madrid</p>
        <p>Tel: +34 912 345 678 • Email: contacto@clinicalumen.es</p>
      </footer>

      {/* Burbuja Flotante de Chat de Atiende */}
      {settings.enabled && (
        <DemoChatBubble
          primaryColor={settings.primaryColor}
          welcomeMessage={settings.welcomeMessage}
          businessName={business?.name || "Clínica Dental Lumen"}
        />
      )}
    </div>
  );
}
