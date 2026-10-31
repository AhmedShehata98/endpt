import { Select } from "@/components";
import type { BodyType, RequestDraft } from "@modules/request";

interface BodyTabProps {
  draft: RequestDraft;
  disabled: boolean;
  onDraftChange: (draft: RequestDraft) => void;
}

export function BodyTab({ draft, disabled, onDraftChange }: BodyTabProps) {
  if (disabled) {
    return (
      <p className="p-1 text-[0.8125rem] text-text-muted">Body is disabled for GET requests.</p>
    );
  }

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
        <textarea
          aria-label="Request body"
          value={draft.body ?? ""}
          onChange={(e) => onDraftChange({ ...draft, body: e.target.value })}
          className="min-h-36 w-full resize-y rounded-md border border-border-default bg-bg-subtle p-2 font-mono text-[0.8125rem] text-text-primary"
          placeholder={draft.bodyType === "json" ? '{ "key": "value" }' : "Raw body"}
        />
      )}
    </div>
  );
}
