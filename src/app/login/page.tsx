import { prisma } from "@/lib/prisma";
import { LoginForm } from "./login-form";
import { MapPin, MessageSquare, ShoppingBag, Gift, BrainCircuit } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const business = await prisma.businessProfile.findFirst();

  return (
    <div className="min-h-screen bg-[#F7F4F9] dark:bg-[#140D17] lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      {/* Panel de marca */}
      <div className="crm-hero-glow relative hidden overflow-hidden bg-[#331E39] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="crm-dot-grid pointer-events-none absolute inset-0 opacity-20" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-[#8E58A6] to-[#5C3470] text-lg font-black shadow-lg shadow-black/20">
            TG
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight">TropiGO AI</span>
              <span className="rounded-full border border-[#C9A7D8]/30 bg-[#C9A7D8]/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#E6D2F0]">
                CRM
              </span>
            </div>
            <p className="text-[11px] font-medium text-[#C9A7D8]">
              Ivirgarzama · Movemos el Trópico 🌴
            </p>
          </div>
        </div>

        <div className="relative max-w-lg space-y-5">
          <span className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/70">
            Centro de operaciones
          </span>
          <h1 className="text-3xl font-black leading-tight tracking-tight xl:text-4xl">
            El pulso de tu negocio, en una sola pantalla.
          </h1>
          <p className="text-sm leading-relaxed text-white/65">
            Conversaciones, pedidos, repartidores, fidelidad y tarifas conectados a
            TropiBot. Entra y toma el control de la operación en Ivirgarzama.
          </p>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {[
              { icon: MessageSquare, text: "WhatsApp y web en una bandeja" },
              { icon: ShoppingBag, text: "Pedidos y reparto en vivo" },
              { icon: Gift, text: "Fidelidad con QR personal" },
              { icon: BrainCircuit, text: "IA con métricas de tokens" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.text}
                  className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5"
                >
                  <Icon className="h-4 w-4 shrink-0 text-[#C9A7D8]" />
                  <span className="text-[11px] font-semibold text-white/75">
                    {item.text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative flex items-center justify-between border-t border-white/10 pt-4 text-[10px] font-medium text-white/40">
          <span>{business?.name || "TropiGO Ivirgarzama"}</span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3 text-[#C9A7D8]" />
            Trópico de Cochabamba
          </span>
        </div>
      </div>

      {/* Formulario */}
      <div className="flex min-h-screen flex-col justify-center px-4 py-10 sm:px-6 lg:px-10">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#331E39] text-sm font-black text-white">
              TG
            </div>
            <div>
              <p className="text-base font-black tracking-tight text-[#1E1523] dark:text-white">
                TropiGO AI
              </p>
              <p className="text-[10px] font-medium text-[#8E58A6] dark:text-[#C9A7D8]">
                CRM privado de operaciones
              </p>
            </div>
          </div>

          <div className="mb-6 space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8E58A6] dark:text-[#C9A7D8]">
              Bienvenido de vuelta
            </span>
            <h2 className="text-2xl font-black tracking-tight text-[#1E1523] dark:text-white">
              Acceso al CRM
            </h2>
            <p className="flex items-center gap-1 text-xs text-[#6B5A72] dark:text-slate-400">
              <MapPin className="h-3.5 w-3.5 text-[#8E58A6] dark:text-[#C9A7D8]" />
              <span>Ivirgarzama · Centro Operativo del Trópico</span>
            </p>
          </div>

          <div className="rounded-3xl border border-[#E8DFED] bg-white p-6 shadow-[0_1px_2px_rgba(51,30,57,0.04),0_20px_50px_-30px_rgba(51,30,57,0.35)] dark:border-white/10 dark:bg-[#1E1423] sm:p-8">
            <LoginForm />
          </div>

          <p className="mt-5 text-center text-[10px] text-[#8E58A6] dark:text-slate-500">
            © {new Date().getFullYear()} TropiGO AI · Delivery, mandados y mototaxi
          </p>
        </div>
      </div>
    </div>
  );
}
