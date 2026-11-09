import React from "react";
import Link from "next/link";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showTagline?: boolean;
  href?: string;
  className?: string;
}

export function Logo({
  size = "md",
  showTagline = true,
  href,
  className = "",
}: LogoProps) {
  const sizeConfig = {
    sm: {
      box: "w-7 h-7 rounded-lg",
      icon: "w-4 h-4",
      title: "text-base tracking-tight",
      tagline: "text-[9px] -mt-0.5",
      gap: "gap-2",
    },
    md: {
      box: "w-9 h-9 rounded-xl",
      icon: "w-5 h-5",
      title: "text-lg tracking-tight",
      tagline: "text-[10px] -mt-0.5",
      gap: "gap-2.5",
    },
    lg: {
      box: "w-11 h-11 rounded-2xl",
      icon: "w-6 h-6",
      title: "text-2xl tracking-tight",
      tagline: "text-xs -mt-1",
      gap: "gap-3",
    },
    xl: {
      box: "w-14 h-14 rounded-2xl",
      icon: "w-8 h-8",
      title: "text-3xl tracking-tight",
      tagline: "text-sm -mt-1",
      gap: "gap-3.5",
    },
  }[size];

  const content = (
    <div className={`flex items-center ${sizeConfig.gap} ${className}`}>
      {/* Símbolo dinámico TropiGO: Hoja tropical + Flecha de movimiento */}
      <div
        className={`${sizeConfig.box} bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0 transform transition-transform hover:scale-105`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${sizeConfig.icon} text-white`}
        >
          {/* Hoja tropical estilizada */}
          <path
            d="M12 2C6.48 2 2 6.48 2 12C2 15.5 3.8 18.58 6.54 20.35C6.18 17.5 7.15 14.5 9.25 12.4C11.35 10.3 14.35 9.33 17.2 9.69C17.05 5.38 14.88 2 12 2Z"
            fill="currentColor"
            fillOpacity="0.85"
          />
          {/* Flecha dinámica de movimiento rápido */}
          <path
            d="M10 17L15 12L10 7V17Z"
            fill="#FBBF24"
          />
        </svg>
      </div>

      <div className="flex flex-col leading-tight">
        <div className={`font-black text-slate-900 ${sizeConfig.title}`}>
          <span>Tropi</span>
          <span className="text-emerald-600">GO</span>
        </div>
        {showTagline && (
          <span className={`font-semibold tracking-wider text-slate-500 uppercase ${sizeConfig.tagline}`}>
            movemos el trópico
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex hover:opacity-95 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}
