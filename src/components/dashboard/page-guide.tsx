"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  ChevronDown,
  HelpCircle,
  Lightbulb,
} from "lucide-react";
import { getSectionByPath } from "@/lib/dashboard/sections";

export function PageGuide() {
  const pathname = usePathname();
  const section = getSectionByPath(pathname);
  const [open, setOpen] = useState(false);

  // El panel principal y la guía completa ya explican todo por sí mismos.
  if (!section || pathname === "/dashboard" || pathname === "/dashboard/guia") {
    return null;
  }

  const Icon = section.icon;

  return (
    <section className="overflow-hidden rounded-2xl border border-[#E0CCE9] bg-white shadow-[0_1px_2px_rgba(51,30,57,0.04),0_10px_28px_-22px_rgba(51,30,57,0.35)] dark:border-white/10 dark:bg-[#1E1423]">
      <div className="flex items-start gap-3 p-3.5 sm:p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#331E39] text-[#E6D2F0] shadow-sm shadow-[#331E39]/20">
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[9px] font-black uppercase tracking-[0.16em] text-[#8E58A6] dark:text-[#C9A7D8]">
              Guía rápida
            </span>
            <span className="text-[10px] font-semibold text-[#B58ACB]">·</span>
            <span className="text-xs font-bold text-[#331E39] dark:text-white">
              {section.title}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] leading-relaxed text-[#5F4B66] dark:text-slate-300 sm:text-xs">
            {section.description}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#E0CCE9] bg-[#F8F4FA] px-2 py-1.5 text-[10px] font-bold text-[#5C3470] transition-colors hover:border-[#C9A7D8] hover:bg-[#F0E6F4] dark:border-white/10 dark:bg-white/[0.06] dark:text-[#D8B8E8] dark:hover:bg-white/[0.1]"
        >
          <HelpCircle className="h-3 w-3" />
          <span className="hidden sm:inline">{open ? "Ocultar" : "¿Cómo funciona?"}</span>
          <ChevronDown
            className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {open && (
        <div className="border-t border-[#F0E6F4] bg-[#FBF8FC] p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="grid gap-3 lg:grid-cols-[1fr_0.9fr]">
            <div>
              <p className="mb-2 text-[9px] font-black uppercase tracking-[0.16em] text-[#8E58A6] dark:text-[#C9A7D8]">
                Pasos recomendados
              </p>
              <ol className="space-y-2">
                {section.steps.map((step, index) => (
                  <li key={step} className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#331E39] text-[9px] font-black text-white">
                      {index + 1}
                    </span>
                    <span className="text-[11px] leading-relaxed text-[#4A3A50] dark:text-slate-300">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-[#E0CCE9] bg-white p-3 dark:border-white/10 dark:bg-[#1E1423]">
                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-[#8E58A6] dark:text-[#C9A7D8]">
                  <Lightbulb className="h-3 w-3" />
                  Consejo
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-[#4A3A50] dark:text-slate-300">
                  {section.tip}
                </p>
              </div>

              <Link
                href="/dashboard/guia"
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#5C3470] transition-colors hover:text-[#331E39] dark:text-[#C9A7D8] dark:hover:text-white"
              >
                Ver guía completa del CRM
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
