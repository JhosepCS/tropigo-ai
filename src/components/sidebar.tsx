"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UtensilsCrossed,
  MessageSquare,
  MapPin,
  Bot,
  Settings,
  LogOut,
  Menu,
  X,
  Store,
  ShoppingBag,
  Users,
  Sparkles,
  ShieldCheck,
  Gift,
} from "lucide-react";

interface SidebarProps {
  pendingOrdersCount?: number;
  unreadCount?: number;
  businessName?: string;
  userName?: string;
  userRole?: string;
}

interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
  badgeColor?: string;
  highlight?: boolean;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

export function Sidebar({
  pendingOrdersCount = 1,
  unreadCount = 2,
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

  // Cerrar el drawer al cambiar de ruta
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const navigation: NavGroup[] = [
    // 1. Panel & Conversaciones
    {
      group: "Atención & Operaciones",
      items: [
        {
          name: "Panel Principal",
          href: "/dashboard",
          icon: LayoutDashboard,
        },
        {
          name: "Conversaciones WhatsApp",
          href: "/dashboard/conversaciones",
          icon: MessageSquare,
          badge: unreadCount > 0 ? `${unreadCount}` : undefined,
          badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
        },
        {
          name: "Pedidos WhatsApp",
          href: "/dashboard/pedidos",
          icon: ShoppingBag,
          badge: pendingOrdersCount > 0 ? `${pendingOrdersCount}` : undefined,
          badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
        },
        {
          name: "Clientes & Memoria",
          href: "/dashboard/clientes",
          icon: Users,
        },
        {
          name: "Fidelidad & Sellos",
          href: "/dashboard/fidelidad",
          icon: Gift,
        },
      ],
    },
    // 2. Comercios, Catálogo y Zonas
    {
      group: "Negocio & Logística",
      items: [
        {
          name: "Comercios",
          href: "/dashboard/comercios",
          icon: Store,
        },
        {
          name: "Catálogo & Menús",
          href: "/dashboard/catalogo",
          icon: UtensilsCrossed,
        },
        {
          name: "Zonas & Tarifas",
          href: "/dashboard/zonas",
          icon: MapPin,
        },
      ],
    },
    // 3. IA y Configuración
    {
      group: "Inteligencia Artificial",
      items: [
        {
          name: "AI Studio (Personalización)",
          href: "/dashboard/ia",
          icon: Sparkles,
          highlight: true,
        },
        {
          name: "Ajustes Generales",
          href: "/dashboard/ajustes",
          icon: Settings,
        },
      ],
    },
  ];

  const renderNavContent = () => (
    <>
      {/* Header / Logo de TropiGO */}
      <div className="p-4 border-b border-[#EAECF0] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 min-w-0 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-lg shadow-sm group-hover:scale-105 transition-transform">
            TG
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm text-[#101828] tracking-tight">
                TropiGO AI
              </span>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.2 rounded-full border border-emerald-200">
                CRM
              </span>
            </div>
            <p className="text-[10px] font-medium text-emerald-700 truncate">
              Ivirgarzama • Movemos el Trópico 🌴
            </p>
          </div>
        </Link>

        {/* Botón cerrar para móvil */}
        <button
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navegación Principal */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {navigation.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <div className="px-3 py-1 text-[10px] font-bold text-[#98A2B3] uppercase tracking-wider">
              {section.group}
            </div>
            {section.items.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition-all group ${
                    isActive
                      ? "bg-emerald-50 text-emerald-900 font-bold border border-emerald-200/60 shadow-2xs"
                      : "text-[#475467] hover:bg-[#F9FAFB] hover:text-[#101828]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive
                          ? "text-emerald-600"
                          : "text-[#667085] group-hover:text-[#101828]"
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.2 rounded-full border font-bold ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}

                  {item.highlight && !item.badge && (
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                      Test IA
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Enlaces de Cambio Rápido de Rol */}
      <div className="p-3 border-t border-[#EAECF0] bg-slate-50/70 space-y-1.5">
        <span className="text-[9px] font-black uppercase text-slate-400 px-1 block">
          Cambiar Vista
        </span>
        <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold">
          <Link
            href="/comercio"
            className="p-1.5 rounded-lg bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 text-center truncate"
          >
            🍳 Cocina
          </Link>
          <Link
            href="/repartidor"
            className="p-1.5 rounded-lg bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 text-center truncate"
          >
            🛵 Repartidor
          </Link>
        </div>
      </div>

      {/* Widget Asistente AI Studio */}
      <div className="px-3 pb-2 pt-1 border-t border-[#EAECF0] bg-[#FAFAFA]">
        <Link
          href="/dashboard/ia"
          className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50/70 border border-emerald-200/60 hover:bg-emerald-100/70 transition-colors"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center text-sm font-bold shadow-2xs">
            🌴
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-900 truncate">TropiBot AI</p>
            <p className="text-[9px] text-emerald-700 font-medium truncate flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              Personalizar en AI Studio
            </p>
          </div>
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        </Link>
      </div>

      {/* Footer Usuario & Ubicación */}
      <div className="p-3 border-t border-[#EAECF0] bg-[#FAFAFA]">
        <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#EAECF0] shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
              {userInitials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#101828] truncate">
                {userName}
              </p>
              <p className="text-[10px] text-emerald-600 font-semibold truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                {userRole} · Ivirgarzama
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Cerrar sesión"
            className="text-[#98A2B3] hover:text-[#475467] p-1.5 rounded-lg hover:bg-[#F2F4F7]"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* 1. Sidebar Permanente para Escritorio (Desktop) */}
      <aside className="hidden lg:flex w-64 border-r border-[#EAECF0] bg-white flex-col h-screen sticky top-0 z-30 select-none">
        {renderNavContent()}
      </aside>

      {/* 2. Botón Flotante para Móvil (abre el Drawer) */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed bottom-4 right-4 z-40 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2.5 rounded-full shadow-lg flex items-center gap-2 text-xs font-bold transition-transform active:scale-95"
        aria-label="Abrir Menú de Despacho"
      >
        <Menu className="w-4 h-4" />
        <span>Menú Admin</span>
      </button>

      {/* 3. Modal / Drawer para Móviles */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop con desenfoque */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Panel Lateral Drawer */}
          <aside className="relative w-72 max-w-[85vw] bg-white h-full flex flex-col shadow-2xl z-10 select-none">
            {renderNavContent()}
          </aside>
        </div>
      )}
    </>
  );
}
