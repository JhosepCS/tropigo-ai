"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  BookOpen,
  Blocks,
  Radio,
  PlayCircle,
  MessageSquare,
  History,
  Settings,
  LogOut,
  Building2,
} from "lucide-react";

interface SidebarProps {
  pendingHumanCount?: number;
  unreadCount?: number;
  agencyName?: string;
}

export function Sidebar({
  pendingHumanCount = 1,
  unreadCount = 3,
  agencyName = "Lumina Digital Agency",
}: SidebarProps) {
  const pathname = usePathname();

  const navigation = [
    {
      name: "Resumen",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Comportamiento",
      href: "/dashboard/comportamiento",
      icon: Sparkles,
    },
    {
      name: "Conocimiento",
      href: "/dashboard/conocimiento",
      icon: BookOpen,
    },
    {
      name: "Integraciones",
      href: "/dashboard/integraciones",
      icon: Blocks,
    },
    {
      name: "Canales",
      href: "/dashboard/canales",
      icon: Radio,
    },
    {
      name: "Probar",
      href: "/dashboard/probar",
      icon: PlayCircle,
      highlight: true,
    },
    {
      name: "Conversaciones",
      href: "/dashboard/conversaciones",
      icon: MessageSquare,
      badge: pendingHumanCount > 0 ? `${pendingHumanCount}` : undefined,
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    },
    {
      name: "Actividad",
      href: "/dashboard/actividad",
      icon: History,
    },
    {
      name: "Ajustes",
      href: "/dashboard/ajustes",
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 border-r border-[#EAECF0] bg-white flex flex-col h-screen sticky top-0 z-30 select-none">
      {/* Header / Logo de la Agencia y Atiende */}
      <div className="p-5 border-b border-[#EAECF0] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            A
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-[#101828]">Atiende</span>
              <span className="text-[10px] bg-teal-50 text-teal-700 font-semibold px-1.5 py-0.5 rounded-full border border-teal-200">
                IA
              </span>
            </div>
            <p className="text-[11px] text-[#667085] truncate flex items-center gap-1">
              <Building2 className="w-3 h-3 shrink-0" />
              <span className="truncate">{agencyName}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Navegación Principal */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wider">
          Panel de Control
        </div>

        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition-all group ${
                isActive
                  ? "bg-[#F4F5F7] text-[#101828] font-semibold shadow-xs"
                  : "text-[#475467] hover:bg-[#F9FAFB] hover:text-[#101828]"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive
                      ? "text-teal-600"
                      : "text-[#667085] group-hover:text-[#101828]"
                  }`}
                />
                <span>{item.name}</span>
              </div>

              {item.badge && (
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}

              {item.highlight && !item.badge && (
                <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md border border-purple-200 font-medium">
                  Vídeo / Demo
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Usuario Administrador */}
      <div className="p-3 border-t border-[#EAECF0] bg-[#FAFAFA]">
        <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#EAECF0] shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0">
              AD
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#101828] truncate">
                Administrador
              </p>
              <p className="text-[10px] text-[#667085] truncate">
                Madrid (Europe/Madrid)
              </p>
            </div>
          </div>
          <button
            title="Cerrar sesión"
            className="text-[#98A2B3] hover:text-[#475467] p-1.5 rounded-lg hover:bg-[#F2F4F7]"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
