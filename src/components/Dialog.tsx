import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "./Button";
import { cn } from "@/lib/cn";

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Dialog({ open, title, onClose, children, footer, className }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "w-full max-w-md rounded-lg border border-border-strong bg-bg-surface shadow-[0_20px_24px_-4px_rgba(16,24,40,0.1)]",
          className,
        )}
      >
        <div className="flex h-11 items-center justify-between border-b border-border-default px-4">
          <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog">
            ×
          </Button>
        </div>
        <div className="p-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-border-default px-4 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
