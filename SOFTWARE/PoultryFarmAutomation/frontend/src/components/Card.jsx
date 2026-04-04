import React from "react";
import { cn } from "../lib/utils";

export const Card = ({ children, className, hover = true, glass = false }) => {
  return (
    <div
      className={cn(
        "p-5 rounded-md border border-border bg-card text-card-foreground shadow-sm overflow-hidden",
        hover &&
          "transition-colors duration-200 hover:border-primary/40 hover:shadow-md",
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
      <div className="w-10 h-10 rounded-md bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
        <Icon size={20} />
      </div>
    )}
    <div>
      <h3 className="font-bold text-lg leading-tight">{title}</h3>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">
          {subtitle}
        </p>
      )}
    </div>
  </div>
);
