import { useMemo } from "react";
import { Select } from "@/components";
import type { BodyType, KeyValuePair, RequestDraft } from "@modules/request";
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
      <p className="text-text-muted flex items-center justify-center p-1 py-12 text-[0.8125rem]">
        Body is disabled for GET requests.
      </p>
    );
  }

  const showError = bodyError ?? jsonError;

  function onSelectBody(evt: React.ChangeEvent<HTMLSelectElement>) {
    const bodyType = evt.target.value as BodyType;
    const filteredHeaders = draft.headers.filter(
      (header) => header.key.toLowerCase() !== "content-type",
    );
    onDraftChange({
      ...draft,
      bodyType,
      ...(bodyType === "json"
        ? {
            headers: [
              ...filteredHeaders,
              {
                id: crypto.randomUUID(),
                key: "Content-Type",
                value: "application/json",
                enabled: true,
              } as KeyValuePair,
            ],
          }
        : {}),
      ...(bodyType === "raw"
        ? {
            headers: [
              ...filteredHeaders,
              {
                id: crypto.randomUUID(),
                key: "Content-Type",
                value: "text/plain",
                enabled: true,
              } as KeyValuePair,
            ],
          }
        : {}),
    });
  }

  return (
    <div className="space-y-2 p-1">
      <Select aria-label="Body type" value={draft.bodyType} onChange={onSelectBody}>
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
            className="border-border-default bg-bg-subtle text-text-primary min-h-36 w-full resize-y rounded-md border p-2 font-mono text-[0.8125rem]"
            placeholder={draft.bodyType === "json" ? '{ "key": "value" }' : "Raw body"}
            aria-invalid={showError != null}
          />
          {showError && <p className="text-error text-[0.75rem]">{showError}</p>}
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
