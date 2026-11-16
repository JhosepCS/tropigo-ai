"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Compass } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { MasterAssistantSwitch } from "@/app/dashboard/master-switch";
import { getSectionByPath } from "@/lib/dashboard/sections";

interface TopbarProps {
  businessName: string;
  isWpConnected: boolean;
  isWebConnected: boolean;
  initialAssistantEnabled: boolean;
}

export function Topbar({
  businessName,
  isWpConnected,
  isWebConnected,
  initialAssistantEnabled,
}: TopbarProps) {
  const pathname = usePathname();
  const section = getSectionByPath(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#E8DFED] bg-white/90 px-4 backdrop-blur-md transition-colors duration-200 dark:border-white/10 dark:bg-[#1B1020]/90 sm:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <Link
          href="/dashboard"
          className="hidden rounded-lg border border-[#E8DFED] bg-[#F8F4FA] px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[#5C3470] transition-colors hover:border-[#C9A7D8] hover:text-[#331E39] dark:border-white/10 dark:bg-white/[0.06] dark:text-[#D8B8E8] sm:block"
        >
          CRM
        </Link>
        <ChevronRight className="hidden h-3.5 w-3.5 text-[#B58ACB] sm:block" />
        <div className="min-w-0">
          <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-[#8E58A6] dark:text-[#C9A7D8]">
            {businessName}
          </p>
          <h1 className="truncate text-sm font-black tracking-tight text-[#1E1523] dark:text-white">
            {section?.title || "Panel Principal"}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-2 xl:flex">
          <div className="flex items-center gap-1.5 rounded-full border border-[#E8DFED] bg-[#F8F4FA] px-2.5 py-1 text-[#5C3470] dark:border-white/10 dark:bg-white/[0.06] dark:text-[#D8B8E8]">
            <span
              className={`h-2 w-2 rounded-full ${
                isWpConnected ? "animate-pulse bg-emerald-500" : "bg-amber-500"
              }`}
            />
            <span className="text-[10px] font-bold">
              WhatsApp: {isWpConnected ? "Conectado" : "Pendiente"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-[#E8DFED] bg-[#F8F4FA] px-2.5 py-1 text-[#5C3470] dark:border-white/10 dark:bg-white/[0.06] dark:text-[#D8B8E8]">
            <span
              className={`h-2 w-2 rounded-full ${
                isWebConnected ? "bg-emerald-500" : "bg-slate-400"
              }`}
            />
            <span className="text-[10px] font-bold">Web: Activo</span>
          </div>
        </div>

        <Link
          href="/dashboard/guia"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#E0CCE9] bg-[#F3EAF7] px-2.5 py-2 text-[11px] font-bold text-[#5C3470] transition-colors hover:border-[#C9A7D8] hover:bg-[#E6D2F0] dark:border-white/10 dark:bg-white/[0.06] dark:text-[#D8B8E8] dark:hover:bg-white/[0.1]"
        >
          <Compass className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Guía del CRM</span>
          <span className="sm:hidden">Guía</span>
        </Link>

        <ThemeToggle />

        <MasterAssistantSwitch initialEnabled={initialAssistantEnabled} />
      </div>
    </header>
  );
}
