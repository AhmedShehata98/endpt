import { useEffect, type ReactNode } from "react";
import { Button } from "./Button";
import { cn } from "@/lib/cn";

interface DrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Drawer({
  open,
  title,
  onClose,
  children,
  footer,
  className,
}: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/20"
        aria-label="Close drawer backdrop"
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed top-0 right-0 z-50 flex h-full w-[22rem] flex-col border-l border-border-default bg-bg-surface shadow-xl",
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border-default px-3">
          <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close drawer">
            ×
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
        {footer ? (
          <div className="flex shrink-0 justify-end gap-2 border-t border-border-default px-3 py-3">
            {footer}
          </div>
        ) : null}
      </aside>
    </>
  );
}
