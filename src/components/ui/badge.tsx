import React from "react";

export type BadgeVariant =
  | "emerald"
  | "amber"
  | "blue"
  | "slate"
  | "rose"
  | "purple"
  | "outline";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: "sm" | "md";
  dot?: boolean;
}

export function Badge({
  children,
  variant = "emerald",
  size = "md",
  dot = false,
  className = "",
  ...props
}: BadgeProps) {
  const sizeStyles = {
    sm: "px-2 py-0.5 text-[11px] gap-1 rounded-md font-medium",
    md: "px-2.5 py-1 text-xs gap-1.5 rounded-lg font-semibold",
  }[size];

  const variantStyles = {
    emerald: "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
    amber: "bg-amber-50 text-amber-800 border border-amber-200/80",
    blue: "bg-sky-50 text-sky-700 border border-sky-200/80",
    slate: "bg-slate-100 text-slate-700 border border-slate-200",
    rose: "bg-rose-50 text-rose-700 border border-rose-200/80",
    purple: "bg-purple-50 text-purple-700 border border-purple-200/80",
    outline: "bg-white text-slate-700 border border-slate-300 shadow-2xs",
  }[variant];

  const dotColors = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    blue: "bg-sky-500",
    slate: "bg-slate-400",
    rose: "bg-rose-500",
    purple: "bg-purple-500",
    outline: "bg-slate-400",
  }[variant];

  return (
    <span
      className={`inline-flex items-center tracking-tight transition-colors ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors} animate-pulse`} />
      )}
      {children}
    </span>
  );
}

/**
 * Presets de Estado de Pedidos y Movilidad TropiGO
 */
export function OrderStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "RECIBIDO":
      return (
        <Badge variant="blue" dot>
          1. Recibido
        </Badge>
      );
    case "EN_PREPARACION":
      return (
        <Badge variant="amber" dot>
          2. En Preparación
        </Badge>
      );
    case "LISTO_RECOJO":
      return (
        <Badge variant="purple" dot>
          3. Listo para Recojo
        </Badge>
      );
    case "ASIGNADO":
      return (
        <Badge variant="amber" dot>
          4. Con Repartidor
        </Badge>
      );
    case "EN_CAMINO":
      return (
        <Badge variant="purple" dot>
          5. En Camino
        </Badge>
      );
    case "ENTREGADO":
      return (
        <Badge variant="emerald">
          ✓ Entregado
        </Badge>
      );
    case "CANCELADO":
      return (
        <Badge variant="rose">
          ✕ Cancelado
        </Badge>
      );
    default:
      return <Badge variant="slate">{status}</Badge>;
  }
}

export function PaymentStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "PAGADO_VERIFICADO":
      return <Badge variant="emerald">✓ Pago Verificado</Badge>;
    case "PENDIENTE":
      return <Badge variant="amber" dot>Pago Pendiente</Badge>;
    case "RECHAZADO":
      return <Badge variant="rose">Pago Rechazado</Badge>;
    default:
      return <Badge variant="slate">{status}</Badge>;
  }
}
