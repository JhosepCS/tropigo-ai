"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  LayoutDashboard,
  LogIn,
  MapPin,
  Menu,
  MessageCircle,
  ShoppingBag,
  X,
} from "lucide-react";

const NAV_LINKS = [
  { label: "Comida", href: "/#comercios" },
  { label: "Mandados", href: "/#servicios" },
  { label: "Mototaxi", href: "/#transporte" },
  { label: "Cobertura", href: "/#cobertura" },
  { label: "Ayuda", href: "/#preguntas" },
];

export function LandingHeader({
  phone,
  isLoggedIn,
  deliveryFee,
}: {
  phone: string;
  isLoggedIn: boolean;
  deliveryFee: number;
}) {
  const [open, setOpen] = useState(false);
  const whatsapp = `https://wa.me/${phone.replace(/[^0-9]/g, "")}`;

  return (
    <>
      {/* Barra de anuncio */}
      <div className="bg-[#331E39] text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-1 px-4 py-1.5 text-[10px] font-semibold sm:text-[11px]">
          <p className="flex items-center gap-1.5">
            <ShoppingBag className="h-3 w-3 text-[#C9A7D8]" />
            Delivery desde Bs. {deliveryFee.toFixed(0)} · Mandados y mototaxi en
            Ivirgarzama
          </p>
          <a
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-[#E6D2F0] transition-colors hover:text-white"
          >
            <MessageCircle className="h-3 w-3" />
            WhatsApp oficial: {phone}
          </a>
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-[#E8DFED] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          {/* Marca */}
          <Link href="/" className="group flex shrink-0 items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8E58A6] to-[#5C3470] text-lg font-black text-white shadow-md shadow-[#331E39]/20 transition-transform group-hover:scale-105">
              TG
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight text-[#1E1523]">
                  TropiGO
                </span>
                <span className="rounded-full bg-[#F3EAF7] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#5C3470]">
                  Bolivia
                </span>
              </div>
              <p className="text-[10px] font-semibold text-[#8E58A6]">
                Movemos el Trópico 🌴
              </p>
            </div>
          </Link>

          {/* Ubicación */}
          <a
            href="/#cobertura"
            className="hidden items-center gap-2 rounded-full border border-[#E8DFED] bg-[#FBF8FC] px-3 py-1.5 text-[11px] font-semibold text-[#4A3A50] transition-colors hover:border-[#C9A7D8] hover:text-[#331E39] lg:flex"
          >
            <MapPin className="h-3.5 w-3.5 text-[#8E58A6]" />
            <span>Ivirgarzama, Trópico de Cochabamba</span>
            <ChevronDown className="h-3 w-3 text-[#B58ACB]" />
          </a>

          {/* Navegación escritorio */}
          <nav className="hidden items-center gap-1 xl:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-xs font-bold text-[#4A3A50] transition-colors hover:bg-[#F8F4FA] hover:text-[#331E39]"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Acciones */}
          <div className="flex items-center gap-2">
            <Link
              href={isLoggedIn ? "/dashboard" : "/login"}
              className="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-[#5C3470] transition-colors hover:bg-[#F8F4FA] hover:text-[#331E39] sm:flex"
            >
              {isLoggedIn ? (
                <LayoutDashboard className="h-3.5 w-3.5" />
              ) : (
                <LogIn className="h-3.5 w-3.5" />
              )}
              {isLoggedIn ? "Ir al panel" : "Ingresar"}
            </Link>

            <Link
              href="/pedir"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#331E39] px-3.5 py-2.5 text-xs font-black text-white shadow-sm shadow-[#331E39]/25 transition-all hover:bg-[#482957] active:scale-[0.98]"
            >
              Pedir ahora
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>

            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-label="Abrir menú"
              aria-expanded={open}
              className="rounded-xl border border-[#E8DFED] p-2 text-[#5C3470] transition-colors hover:bg-[#F8F4FA] xl:hidden"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Menú móvil */}
        {open && (
          <div className="border-t border-[#F0E6F4] bg-white px-4 pb-4 pt-2 xl:hidden">
            <nav className="grid gap-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm font-bold text-[#4A3A50] transition-colors hover:bg-[#F8F4FA] hover:text-[#331E39]"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                href={isLoggedIn ? "/dashboard" : "/login"}
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E0CCE9] bg-[#F8F4FA] px-3 py-2.5 text-xs font-bold text-[#5C3470]"
              >
                {isLoggedIn ? "Ir al panel" : "Ingresar"}
              </Link>
              <a
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </a>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
