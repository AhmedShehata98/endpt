import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface SplitPanelProps {
  top: ReactNode;
  bottom: ReactNode;
  initialTopRatio?: number;
  minTopPx?: number;
  minBottomPx?: number;
  className?: string;
}

export function SplitPanel({
  top,
  bottom,
  initialTopRatio = 0.45,
  minTopPx = 160,
  minBottomPx = 160,
  className,
}: SplitPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [topRatio, setTopRatio] = useState(initialTopRatio);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;

      const onMove = (ev: PointerEvent) => {
        const rect = container.getBoundingClientRect();
        const y = ev.clientY - rect.top;
        const maxTop = rect.height - minBottomPx;
        const clamped = Math.min(Math.max(y, minTopPx), maxTop);
        setTopRatio(clamped / rect.height);
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [minBottomPx, minTopPx],
  );

  return (
    <div ref={containerRef} className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="min-h-0 overflow-hidden" style={{ flex: `${topRatio} 1 0%` }}>
        {top}
      </div>
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize panels"
        tabIndex={0}
        onPointerDown={onPointerDown}
        className="group flex h-3 shrink-0 cursor-row-resize items-center justify-center border-y border-border-default bg-bg-subtle"
      >
        <span className="h-1 w-8 rounded-full bg-border-strong group-hover:bg-accent" />
      </div>
      <div className="min-h-0 overflow-hidden" style={{ flex: `${1 - topRatio} 1 0%` }}>
        {bottom}
      </div>
    </div>
  );
}
