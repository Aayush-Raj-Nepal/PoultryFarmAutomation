import React from "react";
import { cn } from "../lib/utils";

const variants = {
  default: "bg-muted text-foreground border-border",
  primary: "bg-primary text-primary-foreground border-primary",
  success: "bg-amber-100 text-amber-900 border-amber-300",
  warning: "bg-secondary text-secondary-foreground border-yellow-500/40",
  destructive: "bg-destructive text-destructive-foreground border-destructive",
  outline: "border border-border text-muted-foreground bg-transparent",
};

export const Badge = ({ children, variant = "default", className }) => {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-sm text-[11px] font-bold uppercase tracking-wide border transition-colors",
        variants[variant] || variants.default,
        className,
      )}
    >
      {children}
    </span>
  );
};
