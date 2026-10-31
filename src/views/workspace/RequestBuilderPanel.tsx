import { useState } from "react";
import { Button, Input, Select, Tabs } from "@/components";
import { HTTP_METHODS, type HttpMethod, type RequestDraft } from "@modules/request";
import { AuthTab } from "./AuthTab";
import { BodyTab } from "./BodyTab";
import { PairEditor } from "./PairEditor";

type BuilderTab = "params" | "headers" | "body" | "auth";

interface RequestBuilderPanelProps {
  draft: RequestDraft;
  onDraftChange: (draft: RequestDraft) => void;
}

export function RequestBuilderPanel({ draft, onDraftChange }: RequestBuilderPanelProps) {
  const [builderTab, setBuilderTab] = useState<BuilderTab>("params");

  return (
    <div className="flex h-full flex-col bg-bg-surface">
      <div className="flex items-center gap-2 border-b border-border-default p-3">
        <Select
          aria-label="HTTP method"
          value={draft.method}
          onChange={(e) =>
            onDraftChange({ ...draft, method: e.target.value as HttpMethod })
          }
          mono
          className="w-[6.5rem]"
        >
          {HTTP_METHODS.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </Select>
        <Input
          mono
          aria-label="Request URL"
          value={draft.url}
          onChange={(e) => onDraftChange({ ...draft, url: e.target.value })}
          placeholder="https://api.example.com/{{path}}"
          className="h-9 flex-1"
        />
        <Button variant="primary" className="h-9 px-4" title="Send (Ctrl/Cmd+Enter)">
          Send
        </Button>
      </div>

      <Tabs
        className="px-3"
        value={builderTab}
        onChange={(id) => setBuilderTab(id as BuilderTab)}
        items={[
          { id: "params", label: "Params", badge: draft.queryParams.length || undefined },
          { id: "headers", label: "Headers", badge: draft.headers.length || undefined },
          { id: "body", label: "Body" },
          { id: "auth", label: "Auth" },
        ]}
      />

      <div className="min-h-0 flex-1 overflow-auto p-2">
        {builderTab === "params" && (
          <PairEditor
            pairs={draft.queryParams}
            onChange={(queryParams) => onDraftChange({ ...draft, queryParams })}
            addLabel="Add parameter"
          />
        )}
        {builderTab === "headers" && (
          <PairEditor
            pairs={draft.headers}
            onChange={(headers) => onDraftChange({ ...draft, headers })}
            addLabel="Add header"
          />
        )}
        {builderTab === "body" && (
          <BodyTab
            draft={draft}
            disabled={draft.method === "GET"}
            onDraftChange={onDraftChange}
          />
        )}
        {builderTab === "auth" && <AuthTab draft={draft} onDraftChange={onDraftChange} />}
      </div>
    </div>
  );
}
