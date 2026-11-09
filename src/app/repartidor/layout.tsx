import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { Logo } from "@/components/ui/logo";
import { Badge } from "@/components/ui/badge";
import {
  Bike,
  Package,
  Navigation,
  DollarSign,
  LogOut,
  MapPin,
  CheckCircle2,
  Clock,
  ArrowLeft,
  User,
} from "lucide-react";
import { RiderHeaderClient } from "./rider-header-client";

export const dynamic = "force-dynamic";

export default async function RepartidorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // Buscar el perfil de repartidor/mototaxista vinculado al usuario autenticado
  let rider = null;
  if (session?.userId) {
    rider = await prisma.rider.findFirst({
      where: {
        OR: [
          { userId: session.userId },
          { id: session.riderId },
        ],
      },
      include: { city: true },
    });
  }

  // Fallback si es un administrador u operador supervisando la flota
  if (!rider && ["SUPERADMIN", "ADMIN", "OPERATOR"].includes(session?.role || "")) {
    rider = await prisma.rider.findFirst({
      where: { isActive: true },
      include: { city: true },
    });
  }

  // Conteo de pedidos activos asignados estrictamente a este repartidor
  const activeOrdersCount = rider
    ? await prisma.order.count({
        where: {
          assignedRiderId: rider.id,
          status: { in: ["ASIGNADO", "EN_CAMINO"] },
        },
      })
    : 0;

  // Conteo de carreras activas asignadas a este conductor
  const activeRidesCount = rider
    ? await prisma.rideTrip.count({
        where: {
          assignedRiderId: rider.id,
          status: { in: ["CONDUCTOR_ASIGNADO", "EN_CURSO"] },
        },
      })
    : 0;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col pb-20 md:pb-6">
      {/* Top Header Barra de Repartidor */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" href="/" />
            <div className="h-5 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-emerald-50 text-emerald-700">
                <Bike className="w-4 h-4" />
              </span>
              <div>
                <h1 className="text-xs sm:text-sm font-black text-slate-900 truncate flex items-center gap-1.5">
                  <span>{rider?.name || session?.name || "Conductor TropiGO"}</span>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200">
                    {rider?.vehicleType === "TORITO_TRIMOVIL" ? "🛺 Torito" : "🛵 Moto"} • {rider?.plateNumber || "Turno Activo"}
                  </span>
                </h1>
                <p className="text-[10px] text-emerald-700 font-semibold truncate flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-600" />
                  {rider?.city?.name || "Ivirgarzama"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Componente interactivo de estado (Disponible / Fuera de turno) */}
            <RiderHeaderClient
              riderId={rider?.id || "demo_rider"}
              initialAvailable={rider?.isAvailable ?? true}
            />

            {["SUPERADMIN", "ADMIN", "OPERATOR"].includes(session?.role || "") && (
              <Link
                href="/dashboard"
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 px-2 py-1.5 rounded-xl hover:bg-slate-100 hidden lg:inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Admin</span>
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

        {/* Pestañas de Navegación en Escritorio */}
        <div className="hidden md:block border-t border-slate-100 bg-slate-50/50">
          <div className="max-w-4xl mx-auto px-4 flex gap-6 text-xs font-bold text-slate-600">
            <Link
              href="/repartidor"
              className="py-3 flex items-center gap-2 border-b-2 border-emerald-600 text-emerald-800"
            >
              <Package className="w-4 h-4 text-emerald-600" />
              <span>Entregas de Delivery</span>
              {activeOrdersCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                  {activeOrdersCount}
                </span>
              )}
            </Link>
            <Link
              href="/repartidor/carreras"
              className="py-3 flex items-center gap-2 hover:text-emerald-700 transition-colors"
            >
              <Navigation className="w-4 h-4 text-slate-500" />
              <span>Carreras de Pasajeros</span>
              {activeRidesCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                  {activeRidesCount}
                </span>
              )}
            </Link>
            <Link
              href="/repartidor/ganancias"
              className="py-3 flex items-center gap-2 hover:text-emerald-700 transition-colors"
            >
              <DollarSign className="w-4 h-4 text-slate-500" />
              <span>Ganancias en Bs.</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6">
        {children}
      </main>

      {/* Barra de Navegación Móvil Inferior (Fixed Bottom Bar para Conductores) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 px-2 py-1.5 flex items-center justify-around shadow-lg">
        <Link
          href="/repartidor"
          className="flex flex-col items-center gap-1 py-1 px-3 text-emerald-700 font-bold"
        >
          <div className="relative">
            <Package className="w-5 h-5 text-emerald-600" />
            {activeOrdersCount > 0 && (
              <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-black flex items-center justify-center">
                {activeOrdersCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">Entregas</span>
        </Link>

        <Link
          href="/repartidor/carreras"
          className="flex flex-col items-center gap-1 py-1 px-3 text-slate-500 hover:text-emerald-700 font-medium"
        >
          <div className="relative">
            <Navigation className="w-5 h-5" />
            {activeRidesCount > 0 && (
              <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center">
                {activeRidesCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">Carreras</span>
        </Link>

        <Link
          href="/repartidor/ganancias"
          className="flex flex-col items-center gap-1 py-1 px-3 text-slate-500 hover:text-emerald-700 font-medium"
        >
          <DollarSign className="w-5 h-5" />
          <span className="text-[10px]">Ganancias</span>
        </Link>

        <Link
          href="/cuenta"
          className="flex flex-col items-center gap-1 py-1 px-3 text-slate-500 hover:text-slate-800 font-medium"
        >
          <User className="w-5 h-5" />
          <span className="text-[10px]">Perfil</span>
        </Link>
      </nav>
    </div>
  );
}
