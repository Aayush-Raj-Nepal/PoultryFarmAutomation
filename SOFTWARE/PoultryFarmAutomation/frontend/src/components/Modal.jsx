import React from "react";
import { X } from "lucide-react";
import { cn } from "../lib/utils";

const Modal = ({ open, title, onClose, children, className }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          "relative z-10 w-full max-w-6xl max-h-[88vh] overflow-hidden rounded-md border border-border bg-card shadow-2xl",
          className,
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-muted/40">
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-sm border border-border bg-background px-3 py-2 hover:bg-muted"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[calc(88vh-68px)] overflow-auto p-5">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
