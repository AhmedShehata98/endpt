import { useMemo, useState } from "react";
import { Button, MentionInput, Select, Tabs } from "@/components";
import {
  HTTP_METHODS,
  syncParamsFromUrl,
  syncUrlFromParams,
  type HttpMethod,
  type RequestDraft,
  type ValidationIssue,
} from "@modules/request";
import type { SendState } from "@/app/workspace-state";
import { AuthTab } from "./AuthTab";
import { BodyTab } from "./BodyTab";
import { PairEditor } from "./PairEditor";
import { AiOutlineEnter } from "react-icons/ai";
import { CgSpinnerTwo } from "react-icons/cg";

type BuilderTab = "params" | "headers" | "body" | "auth";

interface RequestBuilderPanelProps {
  draft: RequestDraft;
  onDraftChange: (draft: RequestDraft) => void;
  send: SendState;
  envValues: ReadonlyMap<string, string>;
  onSend: () => void;
  onFixVariable: (key: string) => void;
}

export function RequestBuilderPanel({
  draft,
  onDraftChange,
  send,
  envValues,
  onSend,
  onFixVariable,
}: RequestBuilderPanelProps) {
  const [builderTab, setBuilderTab] = useState<BuilderTab>("params");
  const sending = send.status === "sending";
  const issues = send.status === "invalid" ? send.issues : [];
  const urlError = firstIssue(issues, "url");
  const bodyError = firstIssue(issues, "body");
  const otherErrors = issues.filter(
    (issue) => issue.field !== "url" && issue.field !== "body",
  );

  const issueSummary = useMemo(
    () => otherErrors.map((issue) => issue.message).join(" · "),
    [otherErrors],
  );

  const onUrlChange = (url: string) => {
    onDraftChange({
      ...draft,
      url,
      queryParams: syncParamsFromUrl(url, draft.queryParams),
    });
  };

  const onParamsChange = (queryParams: RequestDraft["queryParams"]) => {
    onDraftChange({
      ...draft,
      queryParams,
      url: syncUrlFromParams(draft.url, queryParams),
    });
  };

  return (
    <div className="flex h-full flex-col bg-bg-surface">
      <div className="flex items-start gap-2 border-b border-border-default p-3">
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
        <div className="min-w-0 flex-1">
          <MentionInput
            mono
            aria-label="Request URL"
            value={draft.url}
            onChange={onUrlChange}
            envValues={envValues}
            placeholder="{{baseUrl}}/api/v1/posts"
            className="h-9 w-full"
            aria-invalid={urlError != null}
          />
          {/* <PlaceholderHints
            text={draft.url}
            envValues={envValues}
            onFixVariable={onFixVariable}
          /> */}
          {urlError && <p className="mt-1 text-[0.75rem] text-error">{urlError}</p>}
        </div>
        <Button
          variant="primary"
          className="h-9 px-4"
          title="Send (Ctrl/Cmd+Enter)"
          aria-label={sending ? "Sending" : "Send"}
          disabled={sending}
          onClick={onSend}
        >
          {
            sending 
              ? <>
              <p>Sending…</p>
              <CgSpinnerTwo className="animate-spin" />
              </> 
              : <>
                 <p>Send</p>
                 <AiOutlineEnter />
              </>
          }
        </Button>
      </div>

      {issueSummary && (
        <p className="border-b border-error-subtle bg-error-subtle px-3 py-1.5 text-[0.75rem] text-error">
          {issueSummary}
        </p>
      )}

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
            label="parameters"
            pairs={draft.queryParams}
            onChange={onParamsChange}
            addLabel="Add parameter"
            envValues={envValues}
            onFixVariable={onFixVariable}
          />
        )}
        {builderTab === "headers" && (
          <PairEditor
            label="headers"
            pairs={draft.headers}
            onChange={(headers) => onDraftChange({ ...draft, headers })}
            addLabel="Add header"
            envValues={envValues}
            onFixVariable={onFixVariable}
          />
        )}
        {builderTab === "body" && (
          <BodyTab
            draft={draft}
            disabled={draft.method === "GET"}
            onDraftChange={onDraftChange}
            envValues={envValues}
            onFixVariable={onFixVariable}
            bodyError={bodyError}
          />
        )}
        {builderTab === "auth" && (
          <AuthTab
            draft={draft}
            onDraftChange={onDraftChange}
            envValues={envValues}
            onFixVariable={onFixVariable}
          />
        )}
      </div>
    </div>
  );
}

function firstIssue(issues: ValidationIssue[], field: ValidationIssue["field"]): string | null {
  return issues.find((issue) => issue.field === field)?.message ?? null;
}
