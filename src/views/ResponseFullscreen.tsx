import { useEffect, useRef } from "react";
import { Button, StatusPill } from "@/components";
import type { ResponseView } from "@modules/response";

interface ResponseFullscreenProps {
  open: boolean;
  response: ResponseView;
  wrapLines: boolean;
  onWrapLinesChange: (wrap: boolean) => void;
  onClose: () => void;
}

export function ResponseFullscreen({
  open,
  response,
  wrapLines,
  onWrapLinesChange,
  onClose,
}: ResponseFullscreenProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg-surface" role="dialog" aria-modal="true">
      <div className="flex h-12 items-center justify-between border-b border-border-default px-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-text-primary">Response</h2>
          {response.status != null && response.statusText != null && (
            <StatusPill status={response.status} statusText={response.statusText} />
          )}
          {response.durationMs != null && (
            <span className="font-mono text-[0.75rem] text-text-muted tabular-nums">
              {response.durationMs} ms
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[0.75rem] text-text-secondary">
            <input
              type="checkbox"
              checked={wrapLines}
              onChange={(e) => onWrapLinesChange(e.target.checked)}
              className="size-3.5 accent-accent"
            />
            Wrap lines
          </label>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void navigator.clipboard?.writeText(response.body)}
          >
            Copy
          </Button>
          <Button ref={closeRef} variant="ghost" size="sm" onClick={onClose} aria-label="Close fullscreen">
            Close
          </Button>
        </div>
      </div>
      <pre
        className={`min-h-0 flex-1 overflow-auto p-4 font-mono text-[0.8125rem] leading-5 text-text-primary ${
          wrapLines ? "whitespace-pre-wrap break-words" : "whitespace-pre"
        }`}
      >
        {response.body || "This response has no body."}
      </pre>
    </div>
  );
}
