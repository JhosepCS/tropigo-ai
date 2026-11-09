import React from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";

export interface AlertProps {
  variant?: "success" | "warning" | "error" | "info";
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export function Alert({
  variant = "info",
  title,
  children,
  onClose,
  className = "",
}: AlertProps) {
  const config = {
    success: {
      container: "bg-emerald-50 text-emerald-900 border-emerald-200/80",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
      titleColor: "text-emerald-950",
    },
    warning: {
      container: "bg-amber-50 text-amber-900 border-amber-200/80",
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
      titleColor: "text-amber-950",
    },
    error: {
      container: "bg-rose-50 text-rose-900 border-rose-200/80",
      icon: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
      titleColor: "text-rose-950",
    },
    info: {
      container: "bg-sky-50 text-sky-900 border-sky-200/80",
      icon: <Info className="w-5 h-5 text-sky-600 shrink-0" />,
      titleColor: "text-sky-950",
    },
  }[variant];

  return (
    <div
      className={`relative flex items-start gap-3 p-4 rounded-xl border text-xs leading-relaxed shadow-xs ${config.container} ${className}`}
      role="alert"
    >
      <div className="mt-0.5">{config.icon}</div>

      <div className="flex-1 min-w-0 pr-2">
        {title && (
          <h4 className={`font-bold mb-0.5 text-sm ${config.titleColor}`}>
            {title}
          </h4>
        )}
        <div>{children}</div>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md opacity-70 hover:opacity-100 transition-opacity -mr-1"
          aria-label="Cerrar notificación"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
