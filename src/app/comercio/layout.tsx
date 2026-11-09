import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { Logo } from "@/components/ui/logo";
import { Badge } from "@/components/ui/badge";
import { Utensils, ChefHat, LogOut, Store, ArrowLeft, User } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ComercioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  let merchant = null;
  if (session?.role === "MERCHANT_OWNER") {
    merchant = await prisma.merchant.findFirst({
      where: { ownerId: session.userId },
      include: { city: true },
    });
  }

  // Fallback para administradores supervisando la cocina
  if (!merchant) {
    merchant = await prisma.merchant.findFirst({
      where: { isOpen: true },
      include: { city: true },
    });
  }

  const pendingCount = merchant
    ? await prisma.order.count({
        where: {
          merchantId: merchant.id,
          status: { in: ["RECIBIDO", "EN_PREPARACION"] },
        },
      })
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Navbar Comercio */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo size="sm" href="/" />
            <div className="h-5 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                <Store className="w-4 h-4" />
              </span>
              <div>
                <h1 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                  {merchant?.name || "Panel de Comercio"}
                </h1>
                <p className="text-[10px] text-emerald-700 font-semibold truncate">
                  {merchant?.city?.name || "Ivirgarzama"} • Cocina Activa
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/comercio"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-emerald-700 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <ChefHat className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Comandas Cocina</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                  {pendingCount}
                </span>
              )}
            </Link>

            <Link
              href="/comercio/menu"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-emerald-700 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <Utensils className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Menú y Platos</span>
            </Link>

            <Link
              href="/comercio/perfil"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-emerald-700 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <Store className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Mi Negocio</span>
            </Link>

            {["SUPERADMIN", "ADMIN"].includes(session?.role || "") && (
              <Link
                href="/dashboard"
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 hidden md:inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Admin KDS</span>
              </Link>
            )}

            <Link
              href="/cuenta"
              title="Mi Perfil"
              className="p-2 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-slate-100 transition-colors"
            >
              <User className="w-4 h-4" />
            </Link>

            <Link
              href="/api/auth/logout"
              title="Cerrar sesión"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
