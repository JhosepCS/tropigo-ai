import React from "react";
import { Loader2 } from "lucide-react";

export interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  color?: "primary" | "white" | "slate";
}

export function Spinner({
  size = "md",
  className = "",
  color = "primary",
}: SpinnerProps) {
  const sizeClass = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  }[size];

  const colorClass = {
    primary: "text-emerald-600",
    white: "text-white",
    slate: "text-slate-400",
  }[color];

  return (
    <Loader2
      className={`animate-spin shrink-0 ${sizeClass} ${colorClass} ${className}`}
      aria-label="Cargando contenido..."
    />
  );
}

export function Skeleton({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`}
      {...props}
    />
  );
}
