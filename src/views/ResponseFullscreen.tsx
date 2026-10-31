import { useEffect, useRef } from "react";
import { Button, StatusPill } from "@/components";
import {
  formatResponseBytes,
  responseSizeBytes,
  type ResponseView,
} from "@modules/response";
import { useFormattedBody } from "@/hooks/useFormattedBody";
import { ResponseBodyView } from "@/views/response/ResponseBodyView";

interface ResponseFullscreenProps {
  open: boolean;
  response: ResponseView;
  wrapLines: boolean;
  onWrapLinesChange: (wrap: boolean) => void;
  onCopyResult: (ok: boolean) => void;
  onClose: () => void;
}

export function ResponseFullscreen({
  open,
  response,
  wrapLines,
  onWrapLinesChange,
  onCopyResult,
  onClose,
}: ResponseFullscreenProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const formatted = useFormattedBody(
    open ? response.body : "",
    open ? response.bodyFormat : "raw",
  );
  const sizeLabel = formatResponseBytes(responseSizeBytes(response));

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const copyBody = async () => {
    try {
      await navigator.clipboard.writeText(response.body);
      onCopyResult(true);
    } catch {
      onCopyResult(false);
    }
  };

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
          <span className="font-mono text-[0.75rem] text-text-muted tabular-nums">
            {sizeLabel}
          </span>
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
          <Button variant="secondary" size="sm" onClick={() => void copyBody()}>
            Copy
          </Button>
          <Button
            ref={closeRef}
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close fullscreen"
          >
            Close
          </Button>
        </div>
      </div>
      <ResponseBodyView
        body={formatted.text}
        bodyFormat={formatted.format}
        wrapLines={wrapLines}
        rendering={formatted.rendering}
        className="p-4"
      />
    </div>
  );
}
