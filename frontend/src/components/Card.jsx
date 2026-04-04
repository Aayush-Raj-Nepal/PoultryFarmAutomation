import React from "react";
import { cn } from "../lib/utils";

export const Card = ({ children, className, hover = true, glass = false }) => {
  return (
    <div
      className={cn(
        "p-6 rounded-3xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden",
        hover &&
          "transition-all duration-300 hover:shadow-lg hover:border-primary/20",
        glass && "glass-morphism",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ title, subtitle, icon: Icon, className }) => (
  <div className={cn("flex items-center gap-4 mb-6", className)}>
    {Icon && (
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
        <Icon size={20} />
      </div>
    )}
    <div>
      <h3 className="font-bold text-lg leading-tight">{title}</h3>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      )}
    </div>
  </div>
);
