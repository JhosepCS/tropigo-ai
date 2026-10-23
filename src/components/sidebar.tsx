"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  UtensilsCrossed,
  MapPin,
  Bike,
  QrCode,
  Bot,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  Sparkles,
} from "lucide-react";

interface SidebarProps {
  ordersCount?: number;
  unreadChatsCount?: number;
}

export function Sidebar({ ordersCount = 3, unreadChatsCount = 1 }: SidebarProps) {
  const pathname = usePathname();

  const navigation = [
    {
      name: "Despacho en Vivo (KDS)",
      href: "/dashboard",
      icon: LayoutDashboard,
      badge: ordersCount > 0 ? `${ordersCount}` : undefined,
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
      name: "Conversaciones",
      href: "/dashboard/conversaciones",
      icon: MessageSquare,
      badge: unreadChatsCount > 0 ? `${unreadChatsCount}` : undefined,
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      name: "Catálogo & Menús",
      href: "/dashboard/catalogo",
      icon: UtensilsCrossed,
    },
    {
      name: "Zonas y Tarifas",
      href: "/dashboard/zonas",
      icon: MapPin,
    },
    {
      name: "Repartidores (Motos)",
      href: "/dashboard/repartidores",
      icon: Bike,
    },
    {
      name: "Canal WhatsApp",
      href: "/dashboard/whatsapp",
      icon: QrCode,
    },
    {
      name: "Probar Asistente",
      href: "/dashboard/probar",
      icon: Bot,
      highlight: true,
    },
    {
      name: "Métricas y Ventas",
      href: "/dashboard/metricas",
      icon: BarChart3,
    },
    {
      name: "Ajustes del Sistema",
      href: "/dashboard/ajustes",
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 border-r border-[#EAECF0] bg-white flex flex-col h-screen sticky top-0 z-30 select-none">
      {/* Header / Logo de Tropigo */}
      <div className="p-5 border-b border-[#EAECF0] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            T
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-[#101828]">Tropigo</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-medium px-1.5 py-0.5 rounded-full">
                Delivery
              </span>
            </div>
            <p className="text-xs text-[#667085]">Ivirgarzama, Bolivia</p>
          </div>
        </div>
      </div>

      {/* Navegación Principal */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wider">
          Operaciones
        </div>

        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors group ${
                isActive
                  ? "bg-[#F9FAFB] text-[#101828] font-semibold shadow-xs"
                  : "text-[#475467] hover:bg-[#F9FAFB] hover:text-[#101828]"
              }`}
            >
              <div className="flex items-center gap-3">
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
                  className={`text-xs px-2 py-0.5 rounded-full border font-medium ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}

              {item.highlight && !item.badge && (
                <span className="flex items-center gap-1 text-[11px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-md border border-purple-200">
                  <Sparkles className="w-3 h-3 text-purple-600" /> IA
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Usuario */}
      <div className="p-3 border-t border-[#EAECF0] bg-[#FAFAFA]">
        <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#EAECF0]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-xs flex items-center justify-center">
              AD
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-[#101828] truncate">
                Admin Tropigo
              </p>
              <p className="text-[11px] text-[#667085] truncate">admin@tropigo.bo</p>
            </div>
          </div>
          <button
            title="Cerrar Sesión"
            className="text-[#98A2B3] hover:text-[#475467] p-1 rounded-md"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
