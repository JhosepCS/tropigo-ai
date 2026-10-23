"use client";

import { useState } from "react";
import { Power } from "lucide-react";

interface MasterAssistantSwitchProps {
  initialEnabled: boolean;
}

export function MasterAssistantSwitch({ initialEnabled }: MasterAssistantSwitchProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    const nextVal = !enabled;
    setEnabled(nextVal);
    setLoading(true);

    try {
      await fetch("/api/settings/toggle-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextVal }),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border shadow-2xs ${
        enabled
          ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
          : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
      }`}
    >
      <span
        className={`w-2.5 h-2.5 rounded-full ${
          enabled ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
        }`}
      />
      <span>{enabled ? "Asistente encendido" : "Asistente en pausa"}</span>
    </button>
  );
}
