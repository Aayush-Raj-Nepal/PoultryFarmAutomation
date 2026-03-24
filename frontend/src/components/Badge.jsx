import React from "react";
import { cn } from "../lib/utils";

const variants = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary border-primary/20",
  success: "bg-green-500/10 text-green-600 border-green-500/20",
  warning: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  destructive: "bg-destructive/10 text-destructive border-destructive/20",
  outline: "border border-border text-muted-foreground bg-transparent",
};

export const Badge = ({ children, variant = "default", className }) => {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors",
        variants[variant] || variants.default,
        className,
      )}
    >
      {children}
    </span>
  );
};
