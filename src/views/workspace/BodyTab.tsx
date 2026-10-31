import { useMemo } from "react";
import { Select } from "@/components";
import type { BodyType, RequestDraft } from "@modules/request";
import { PlaceholderHints } from "./PlaceholderHints";

interface BodyTabProps {
  draft: RequestDraft;
  disabled: boolean;
  onDraftChange: (draft: RequestDraft) => void;
  envValues: ReadonlyMap<string, string>;
  onFixVariable: (key: string) => void;
  bodyError?: string | null;
}

export function BodyTab({
  draft,
  disabled,
  onDraftChange,
  envValues,
  onFixVariable,
  bodyError = null,
}: BodyTabProps) {
  const jsonError = useMemo(() => {
    if (draft.bodyType !== "json") return null;
    const text = draft.body ?? "";
    if (text.trim().length === 0) return "Body is not valid JSON";
    try {
      JSON.parse(text);
      return null;
    } catch {
      return "Body is not valid JSON";
    }
  }, [draft.body, draft.bodyType]);

  if (disabled) {
    return (
      <p className="p-1 text-[0.8125rem] text-text-muted">Body is disabled for GET requests.</p>
    );
  }

  const showError = bodyError ?? jsonError;

  return (
    <div className="space-y-2 p-1">
      <Select
        aria-label="Body type"
        value={draft.bodyType}
        onChange={(e) => onDraftChange({ ...draft, bodyType: e.target.value as BodyType })}
      >
        <option value="none">None</option>
        <option value="json">JSON</option>
        <option value="raw">Raw</option>
      </Select>
      {draft.bodyType !== "none" && (
        <>
          <textarea
            aria-label="Request body"
            value={draft.body ?? ""}
            onChange={(e) => onDraftChange({ ...draft, body: e.target.value })}
            className="min-h-36 w-full resize-y rounded-md border border-border-default bg-bg-subtle p-2 font-mono text-[0.8125rem] text-text-primary"
            placeholder={draft.bodyType === "json" ? '{ "key": "value" }' : "Raw body"}
            aria-invalid={showError != null}
          />
          {showError && <p className="text-[0.75rem] text-error">{showError}</p>}
          <PlaceholderHints
            text={draft.body ?? ""}
            envValues={envValues}
            onFixVariable={onFixVariable}
          />
        </>
      )}
    </div>
  );
}
