"use client";

import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Compass, LayoutDashboard } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-6 sm:p-10 text-slate-900">
      <header className="flex justify-center sm:justify-start">
        <Logo size="md" href="/" />
      </header>

      <main className="max-w-md mx-auto text-center space-y-6 my-auto py-12">
        <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs border border-emerald-200">
          <Compass className="w-8 h-8 animate-spin-slow" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold text-emerald-700 tracking-wider uppercase bg-emerald-100/70 px-3 py-1 rounded-full">
            Error 404 • Ruta no encontrada
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Parece que te desviaste de ruta
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            La página que buscas no existe o fue trasladada. En TropiGO seguimos
            moviendo el trópico: vuelve a la portada para pedir tu delivery o
            carrera en Ivirgarzama.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/">
            <Button
              variant="primary"
              size="md"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Volver a la Portada
            </Button>
          </Link>

          <Link href="/dashboard">
            <Button
              variant="outline"
              size="md"
              leftIcon={<LayoutDashboard className="w-4 h-4" />}
            >
              Ir al Tablero KDS
            </Button>
          </Link>
        </div>
      </main>

      <footer className="text-center text-xs text-slate-400">
        <p>TropiGO Ivirgarzama • Trópico de Cochabamba, Bolivia</p>
      </footer>
    </div>
  );
}
