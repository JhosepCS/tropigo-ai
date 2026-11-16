"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  Compass,
  LogOut,
  Menu,
  Sparkles,
  X,
} from "lucide-react";
import {
  CRM_GROUPS,
  CRM_SECTIONS,
  type CrmSection,
} from "@/lib/dashboard/sections";

interface SidebarProps {
  pendingOrdersCount?: number;
  unreadCount?: number;
  businessName?: string;
  userName?: string;
  userRole?: string;
}

function isSectionActive(pathname: string, section: CrmSection) {
  if (section.href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname.startsWith(section.href);
}

export function Sidebar({
  pendingOrdersCount = 0,
  unreadCount = 0,
  businessName = "TropiGO Ivirgarzama",
  userName = "Operador Central",
  userRole = "ADMIN",
}: SidebarProps) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = () => {
    try {
      localStorage.removeItem("tropigo_token");
      localStorage.removeItem("tropigo_logged_in");
    } catch {}
    window.location.href = "/api/auth/logout";
  };

  const userInitials =
    userName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "IV";

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const renderBadge = (section: CrmSection) => {
    const count =
      section.badge === "orders"
        ? pendingOrdersCount
        : section.badge === "conversations"
          ? unreadCount
          : 0;

    if (!section.badge || count <= 0) return null;

    return (
      <span className="min-w-[20px] rounded-full border border-[#C9A7D8]/25 bg-[#C9A7D8]/15 px-1.5 py-0.5 text-center text-[10px] font-bold text-[#E6D2F0]">
        {count > 99 ? "99+" : count}
      </span>
    );
  };

  const renderNavContent = () => (
    <>
      {/* Marca */}
      <div className="flex items-center justify-between border-b border-white/10 p-4">
        <Link href="/dashboard" className="group flex min-w-0 items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-gradient-to-br from-[#8E58A6] to-[#5C3470] text-lg font-black text-white shadow-lg shadow-black/20 transition-transform group-hover:scale-105">
            TG
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-black tracking-tight text-white">
                TropiGO AI
              </span>
              <span className="rounded-full border border-[#C9A7D8]/30 bg-[#C9A7D8]/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#E6D2F0]">
                CRM
              </span>
            </div>
            <p className="truncate text-[10px] font-medium text-[#C9A7D8]">
              Ivirgarzama · Movemos el Trópico 🌴
            </p>
          </div>
        </Link>

        <button
          onClick={() => setIsMobileOpen(false)}
          className="rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Cerrar menú"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navegación */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
        {CRM_GROUPS.map((group) => {
          const items = CRM_SECTIONS.filter((section) => section.group === group);
          if (items.length === 0) return null;

          return (
            <div key={group} className="space-y-0.5">
              <div className="px-3 pb-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">
                {group}
              </div>
              {items.map((section) => {
                const active = isSectionActive(pathname, section);
                const Icon = section.icon;

                return (
                  <Link
                    key={section.href}
                    href={section.href}
                    className={`group relative flex items-center justify-between rounded-xl px-3 py-1.5 text-[11px] transition-all ${
                      active
                        ? "border border-white/10 bg-white/[0.09] font-bold text-white shadow-sm"
                        : "font-medium text-white/60 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-[#C9A7D8]" />
                    )}
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Icon
                        className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                          active
                            ? "text-[#D8B8E8]"
                            : "text-white/40 group-hover:text-[#D8B8E8]"
                        }`}
                      />
                      <span className="truncate">{section.name}</span>
                    </span>
                    {renderBadge(section)}
                    {section.href === "/dashboard/ia" && !section.badge && (
                      <Sparkles className="h-3 w-3 shrink-0 text-[#C9A7D8]/70" />
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Guía rápida */}
      <div className="px-3 pb-2.5">
        <Link
          href="/dashboard/guia"
          className="group block rounded-xl border border-white/10 bg-white/[0.05] p-2.5 transition-colors hover:bg-white/[0.09]"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#C9A7D8]/15 text-[#E6D2F0]">
              <Compass className="h-3 w-3" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-white">¿Nuevo en el CRM?</p>
              <p className="truncate text-[8px] text-white/50">
                Aprende qué hace cada sección
              </p>
            </div>
            <ChevronRight className="h-3 w-3 text-white/40 transition-transform group-hover:translate-x-0.5 group-hover:text-[#D8B8E8]" />
          </div>
        </Link>
      </div>

      {/* Cambiar vista */}
      <div className="space-y-1 border-t border-white/10 p-2.5">
        <span className="block px-1 text-[8px] font-black uppercase tracking-wider text-white/35">
          Cambiar vista
        </span>
        <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold">
          <Link
            href="/comercio"
            className="truncate rounded-lg border border-white/10 bg-white/[0.05] p-1.5 text-center text-white/70 transition-colors hover:bg-white/[0.09] hover:text-white"
          >
            🍳 Cocina
          </Link>
          <Link
            href="/repartidor"
            className="truncate rounded-lg border border-white/10 bg-white/[0.05] p-1.5 text-center text-white/70 transition-colors hover:bg-white/[0.09] hover:text-white"
          >
            🛵 Repartidor
          </Link>
        </div>
      </div>

      {/* Usuario */}
      <div className="border-t border-white/10 p-2.5">
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.05] p-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#C9A7D8]/20 text-[10px] font-bold text-[#E6D2F0]">
              {userInitials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-bold text-white">{userName}</p>
              <p className="flex items-center gap-1 truncate text-[9px] font-semibold text-[#C9A7D8]">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                {userRole} · {businessName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Cerrar sesión"
            className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Sidebar escritorio */}
      <aside className="sticky top-0 z-30 hidden h-screen w-[272px] select-none flex-col border-r border-white/10 bg-[#331E39] text-white shadow-2xl shadow-[#331E39]/20 lg:flex">
        {renderNavContent()}
      </aside>

      {/* Botón móvil */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-[#331E39] px-3.5 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#331E39]/30 transition-transform hover:bg-[#482957] active:scale-95 lg:hidden"
        aria-label="Abrir menú del CRM"
      >
        <Menu className="h-4 w-4" />
        <span>Menú CRM</span>
      </button>

      {/* Drawer móvil */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-[#1F1024]/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-72 max-w-[85vw] select-none flex-col bg-[#331E39] text-white shadow-2xl">
            {renderNavContent()}
          </aside>
        </div>
      )}
    </>
  );
}
