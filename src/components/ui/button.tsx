import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "outline"
    | "ghost"
    | "solar"
    | "danger"
    | "subtle";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = "",
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.98]";

    const sizeStyles = {
      sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
      md: "h-10 px-4 text-sm rounded-xl gap-2",
      lg: "h-12 px-6 text-base rounded-xl gap-2.5",
      icon: "h-9 w-9 rounded-xl p-0",
    }[size];

    const variantStyles = {
      primary:
        "bg-[#331E39] hover:bg-[#482957] text-white shadow-sm shadow-[#331E39]/25 focus-visible:ring-[#8E58A6] border border-[#331E39]",
      secondary:
        "bg-[#F3EAF7] hover:bg-[#E6D2F0] text-[#331E39] border border-[#E0CCE9] focus-visible:ring-[#8E58A6]",
      outline:
        "bg-white hover:bg-[#FBF8FC] text-[#5C3470] border border-[#D8B8E8] focus-visible:ring-[#8E58A6] shadow-xs",
      ghost:
        "bg-transparent hover:bg-[#F3EAF7] text-[#5C3470] hover:text-[#331E39] focus-visible:ring-[#8E58A6]",
      solar:
        "bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm shadow-amber-500/20 focus-visible:ring-amber-400 border border-amber-600/20",
      danger:
        "bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/20 focus-visible:ring-rose-500 border border-rose-700/20",
      subtle:
        "bg-[#F3EAF7] hover:bg-[#E6D2F0] text-[#5C3470] border border-[#E0CCE9] focus-visible:ring-[#8E58A6]",
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children}
        {!isLoading && rightIcon && (
          <span className="shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
