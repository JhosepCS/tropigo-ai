"use client";

import { useState } from "react";
import { Power } from "lucide-react";

export function RiderHeaderClient({
  riderId,
  initialAvailable,
}: {
  riderId: string;
  initialAvailable: boolean;
}) {
  const [isAvailable, setIsAvailable] = useState(initialAvailable);
  const [isLoading, setIsLoading] = useState(false);

  const toggleAvailability = async () => {
    setIsLoading(true);
    const newStatus = !isAvailable;
    setIsAvailable(newStatus);

    try {
      await fetch("/api/repartidor/toggle-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riderId, isAvailable: newStatus }),
      });
    } catch (e) {
      console.error(e);
      // Revertir en error
      setIsAvailable(!newStatus);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={toggleAvailability}
      disabled={isLoading}
      title={isAvailable ? "Hacer clic para pausar turno" : "Hacer clic para activarte"}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
        isAvailable
          ? "bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs hover:bg-emerald-100"
          : "bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200"
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          isAvailable ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
        }`}
      />
      <span className="hidden sm:inline">
        {isAvailable ? "Disponible" : "Fuera de Turno"}
      </span>
      <Power className="w-3 h-3 ml-0.5 opacity-70" />
    </button>
  );
}
