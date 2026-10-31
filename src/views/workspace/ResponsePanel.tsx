import { forwardRef, useState, type ForwardedRef } from "react";
import { Button, EmptyState, StatusPill, Tabs } from "@/components";
import {
  formatResponseBytes,
  responseSizeBytes,
  type ResponseView,
} from "@modules/response";
import type { SendState } from "@/app/workspace-state";
import { useFormattedBody } from "@/hooks/useFormattedBody";
import { ResponseBodyView } from "@/views/response/ResponseBodyView";
import { ResponseHeadersTable } from "@/views/response/ResponseHeadersTable";

type ResponseTab = "body" | "headers";

interface ResponsePanelProps {
  send: SendState;
  response: ResponseView | null;
  showPreviousResponse: boolean;
  wrapLines: boolean;
  onWrapLinesChange: (wrap: boolean) => void;
  onOpenFullscreen: () => void;
  onTryAgain: () => void;
  onCopyResult: (ok: boolean) => void;
}

export const ResponsePanel = forwardRef<HTMLButtonElement, ResponsePanelProps>(
  function ResponsePanel(
    {
      send,
      response,
      showPreviousResponse,
      wrapLines,
      onWrapLinesChange,
      onOpenFullscreen,
      onTryAgain,
      onCopyResult,
    },
    fullscreenTriggerRef,
  ) {
    const [responseTab, setResponseTab] = useState<ResponseTab>("body");

    if (send.status === "network-error" && !response) {
      return (
        <div className="flex h-full flex-col bg-bg-surface p-4">
          <EmptyState
            title="Network failure"
            description={send.message}
            action={
              <Button variant="secondary" size="sm" onClick={onTryAgain}>
                Try again
              </Button>
            }
          />
          {send.durationMs != null && (
            <p className="mt-2 text-center font-mono text-[0.75rem] text-text-muted">
              {send.durationMs} ms
            </p>
          )}
        </div>
      );
    }

    if (!response) {
      if (send.status === "sending") {
        return (
          <div className="flex h-full flex-col bg-bg-surface">
            <EmptyState title="Sending…" description="Waiting for a response." />
          </div>
        );
      }
      return (
        <div className="flex h-full flex-col bg-bg-surface">
          <EmptyState
            title="No response yet"
            description="Send a request to inspect the response."
          />
        </div>
      );
    }

    return (
      <ResponsePanelContent
        response={response}
        send={send}
        showPreviousResponse={showPreviousResponse}
        wrapLines={wrapLines}
        onWrapLinesChange={onWrapLinesChange}
        onOpenFullscreen={onOpenFullscreen}
        onTryAgain={onTryAgain}
        onCopyResult={onCopyResult}
        responseTab={responseTab}
        onResponseTabChange={setResponseTab}
        fullscreenTriggerRef={fullscreenTriggerRef}
      />
    );
  },
);

interface ResponsePanelContentProps {
  response: ResponseView;
  send: SendState;
  showPreviousResponse: boolean;
  wrapLines: boolean;
  onWrapLinesChange: (wrap: boolean) => void;
  onOpenFullscreen: () => void;
  onTryAgain: () => void;
  onCopyResult: (ok: boolean) => void;
  responseTab: ResponseTab;
  onResponseTabChange: (tab: ResponseTab) => void;
  fullscreenTriggerRef: ForwardedRef<HTMLButtonElement>;
}

function ResponsePanelContent({
  response,
  send,
  showPreviousResponse,
  wrapLines,
  onWrapLinesChange,
  onOpenFullscreen,
  onTryAgain,
  onCopyResult,
  responseTab,
  onResponseTabChange,
  fullscreenTriggerRef,
}: ResponsePanelContentProps) {
  const formatted = useFormattedBody(response.body, response.bodyFormat);
  const sizeLabel = formatResponseBytes(responseSizeBytes(response));

  const copyBody = async () => {
    try {
      await navigator.clipboard.writeText(response.body);
      onCopyResult(true);
    } catch {
      onCopyResult(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-bg-surface">
      {showPreviousResponse && (
        <div className="border-b border-warning-subtle bg-warning-subtle px-3 py-1.5 text-[0.75rem] text-warning">
          Previous response
        </div>
      )}
      {send.status === "network-error" && (
        <div className="flex items-center justify-between gap-2 border-b border-error-subtle bg-error-subtle px-3 py-1.5 text-[0.75rem] text-error">
          <span>{send.message}</span>
          <Button variant="ghost" size="sm" className="h-6 text-error" onClick={onTryAgain}>
            Try again
          </Button>
        </div>
      )}
      <div className="flex h-9 items-center justify-between gap-3 border-b border-border-default bg-bg-subtle px-3">
        <div className="flex min-w-0 items-center gap-3">
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
        <div className="flex shrink-0 items-center gap-2">
          <label className="flex items-center gap-1.5 text-[0.75rem] text-text-secondary">
            <input
              type="checkbox"
              checked={wrapLines}
              onChange={(e) => onWrapLinesChange(e.target.checked)}
              className="size-3.5 accent-accent"
            />
            Wrap lines
          </label>
          <Button variant="ghost" size="sm" onClick={() => void copyBody()}>
            Copy
          </Button>
          <Button
            ref={fullscreenTriggerRef}
            variant="ghost"
            size="sm"
            onClick={onOpenFullscreen}
          >
            Fullscreen
          </Button>
        </div>
      </div>
      <Tabs
        className="px-3"
        value={responseTab}
        onChange={(id) => onResponseTabChange(id as ResponseTab)}
        items={[
          { id: "body", label: "Body" },
          { id: "headers", label: "Headers", badge: response.headers.length },
        ]}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-auto">
        {responseTab === "body" ? (
          <ResponseBodyView
            body={formatted.text}
            bodyFormat={formatted.format}
            wrapLines={wrapLines}
            rendering={formatted.rendering}
          />
        ) : (
          <ResponseHeadersTable headers={response.headers} />
        )}
      </div>
    </div>
  );
}
