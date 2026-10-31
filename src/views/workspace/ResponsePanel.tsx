import { useState } from "react";
import { Button, EmptyState, StatusPill, Tabs } from "@/components";
import type { ResponseView } from "@modules/response";
import type { SendState } from "@/app/workspace-state";
import { ResponseBodyView } from "@/views/response/ResponseBodyView";
import { ResponseHeadersTable } from "@/views/response/ResponseHeadersTable";

type ResponseTab = "body" | "headers";

interface ResponsePanelProps {
  send: SendState;
  response: ResponseView | null;
  showPreviousResponse: boolean;
  wrapLines: boolean;
  onOpenFullscreen: () => void;
  onTryAgain: () => void;
}

export function ResponsePanel({
  send,
  response,
  showPreviousResponse,
  wrapLines,
  onOpenFullscreen,
  onTryAgain,
}: ResponsePanelProps) {
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
        <div className="flex items-center gap-3">
          {response.status != null && response.statusText != null && (
            <StatusPill status={response.status} statusText={response.statusText} />
          )}
          {response.durationMs != null && (
            <span className="font-mono text-[0.75rem] text-text-muted tabular-nums">
              {response.durationMs} ms
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void navigator.clipboard?.writeText(response.body)}
          >
            Copy
          </Button>
          <Button variant="ghost" size="sm" onClick={onOpenFullscreen}>
            Fullscreen
          </Button>
        </div>
      </div>
      <Tabs
        className="px-3"
        value={responseTab}
        onChange={(id) => setResponseTab(id as ResponseTab)}
        items={[
          { id: "body", label: "Body" },
          { id: "headers", label: "Headers", badge: response.headers.length },
        ]}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-auto">
        {responseTab === "body" ? (
          <ResponseBodyView body={response.body} wrapLines={wrapLines} />
        ) : (
          <ResponseHeadersTable headers={response.headers} />
        )}
      </div>
    </div>
  );
}
