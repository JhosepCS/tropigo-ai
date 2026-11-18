import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RegistroRepartidorClient } from "./registro-repartidor-client";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Registro de repartidores · TropiGO",
  description:
    "Regístrate como repartidor o mototaxista de TropiGO en Ivirgarzama. Recibe pedidos y carreras por WhatsApp, sin correo ni contraseña.",
};

export default async function RegistroRepartidorPage() {
  const [city, business] = await Promise.all([
    prisma.city.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: { name: true },
    }),
    prisma.businessProfile.findFirst({
      select: { name: true, phone: true },
    }),
  ]);

  const cityName = city?.name || "Ivirgarzama";
  const supportPhone = String(business?.phone || "").replace(/\D/g, "");
  const supportUrl = supportPhone
    ? `https://wa.me/${supportPhone.startsWith("591") ? supportPhone : `591${supportPhone}`}`
    : "https://wa.me/59157770679";

  return (
    <main className="min-h-screen bg-[#F7F4F9] text-[#1E1523]">
      <header className="border-b border-[#E8DFED] bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#6B5A72] transition hover:text-[#331E39]"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
          <span className="rounded-full bg-[#331E39] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#E6D2F0]">
            TropiGO
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <div className="mb-6 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E0CCE9] bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#8E58A6]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Registro gratuito
          </span>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Gana con TropiGO en {cityName}
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-[#6B5A72]">
            Regístrate como repartidor o mototaxista. Recibirás cada carrera por
            WhatsApp con un botón para aceptar, marcar en camino y entregar.
            Sin correo, sin contraseña, sin comisiones por registro.
          </p>
        </div>

        <RegistroRepartidorClient supportUrl={supportUrl} cityName={cityName} />
      </div>
    </main>
  );
}
