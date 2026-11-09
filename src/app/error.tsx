"use client";

import React, { useEffect } from "react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("TropiGO Application Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-6 sm:p-10 text-slate-900">
      <header className="flex justify-center sm:justify-start">
        <Logo size="md" href="/" />
      </header>

      <main className="max-w-md mx-auto text-center space-y-6 my-auto py-12">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-xs border border-rose-200">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold text-rose-700 tracking-wider uppercase bg-rose-100/70 px-3 py-1 rounded-full">
            Interrupción Temporal
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Algo inesperado ocurrió en el camino
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Hemos registrado el incidente para solucionarlo de inmediato. Puedes
            reintentar la acción o volver a la portada de TropiGO.
          </p>
          {error.digest && (
            <p className="text-[10px] font-mono text-slate-400 bg-slate-100 py-1 px-2 rounded-md inline-block">
              ID de error: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            variant="primary"
            size="md"
            onClick={() => reset()}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Reintentar Acción
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={() => (window.location.href = "/")}
            leftIcon={<Home className="w-4 h-4" />}
          >
            Ir al Inicio
          </Button>
        </div>
      </main>

      <footer className="text-center text-xs text-slate-400">
        <p>Centro de Soporte TropiGO Ivirgarzama</p>
      </footer>
    </div>
  );
}
