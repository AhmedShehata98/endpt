import { useState } from "react";
import { Button, EmptyState, StatusPill, Tabs } from "@/components";
import type { ResponseView } from "@modules/response";
import { ResponseBodyView } from "@/views/response/ResponseBodyView";
import { ResponseHeadersTable } from "@/views/response/ResponseHeadersTable";

type ResponseTab = "body" | "headers";

interface ResponsePanelProps {
  response: ResponseView | null;
  wrapLines: boolean;
  onOpenFullscreen: () => void;
}

export function ResponsePanel({
  response,
  wrapLines,
  onOpenFullscreen,
}: ResponsePanelProps) {
  const [responseTab, setResponseTab] = useState<ResponseTab>("body");

  if (!response) {
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
