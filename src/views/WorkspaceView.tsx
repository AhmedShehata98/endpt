import { useState } from "react";
import {
  Button,
  EmptyState,
  Input,
  KeyValueRow,
  MethodBadge,
  SecretInput,
  Select,
  SplitPanel,
  StatusPill,
  Tabs,
} from "@/components";
import type { AuthType, BodyType, HttpMethod, KeyValuePair, RequestDraft } from "@modules/request";
import type { ResponseView } from "@modules/response";

interface WorkspaceViewProps {
  draft: RequestDraft;
  onDraftChange: (draft: RequestDraft) => void;
  response: ResponseView | null;
  onOpenFullscreen: () => void;
}

type BuilderTab = "params" | "headers" | "body" | "auth";
type ResponseTab = "body" | "headers";

function updatePairs(
  pairs: KeyValuePair[],
  id: string,
  patch: Partial<KeyValuePair>,
): KeyValuePair[] {
  return pairs.map((p) => (p.id === id ? { ...p, ...patch } : p));
}

export function WorkspaceView({
  draft,
  onDraftChange,
  response,
  onOpenFullscreen,
}: WorkspaceViewProps) {
  const [builderTab, setBuilderTab] = useState<BuilderTab>("params");
  const [responseTab, setResponseTab] = useState<ResponseTab>("body");
  const bodyDisabled = draft.method === "GET";

  const requestPanel = (
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
          {(["GET", "POST", "PUT", "PATCH", "DELETE"] as HttpMethod[]).map((m) => (
            <option key={m} value={m}>
              {m}
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
          <div className="space-y-2 p-1">
            {bodyDisabled ? (
              <p className="text-[0.8125rem] text-text-muted">
                Body is disabled for GET requests.
              </p>
            ) : (
              <>
                <Select
                  aria-label="Body type"
                  value={draft.bodyType}
                  onChange={(e) =>
                    onDraftChange({ ...draft, bodyType: e.target.value as BodyType })
                  }
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
              </>
            )}
          </div>
        )}
        {builderTab === "auth" && (
          <div className="space-y-3 p-1">
            <label className="flex items-center gap-2 text-[0.8125rem] text-text-secondary">
              <input
                type="checkbox"
                checked={draft.auth.enabled}
                onChange={(e) =>
                  onDraftChange({
                    ...draft,
                    auth: { ...draft.auth, enabled: e.target.checked },
                  })
                }
                className="size-3.5 accent-accent"
              />
              Enable authentication
            </label>
            {draft.auth.enabled && (
              <>
                <Select
                  aria-label="Auth type"
                  value={draft.auth.type}
                  onChange={(e) =>
                    onDraftChange({
                      ...draft,
                      auth: { ...draft.auth, type: e.target.value as AuthType },
                    })
                  }
                >
                  <option value="bearerToken">Bearer token</option>
                  <option value="apiKey">API key</option>
                  <option value="basic">Username / password</option>
                </Select>
                {draft.auth.type === "bearerToken" && (
                  <SecretInput
                    aria-label="Token"
                    value={draft.auth.token ?? ""}
                    onChange={(token) =>
                      onDraftChange({ ...draft, auth: { ...draft.auth, token } })
                    }
                    placeholder="{{authToken}}"
                  />
                )}
                {draft.auth.type === "apiKey" && (
                  <div className="grid gap-2">
                    <Input
                      aria-label="API key header"
                      value={draft.auth.apiKeyHeader ?? ""}
                      onChange={(e) =>
                        onDraftChange({
                          ...draft,
                          auth: { ...draft.auth, apiKeyHeader: e.target.value },
                        })
                      }
                      placeholder="X-API-Key"
                    />
                    <SecretInput
                      aria-label="API key"
                      value={draft.auth.apiKey ?? ""}
                      onChange={(apiKey) =>
                        onDraftChange({ ...draft, auth: { ...draft.auth, apiKey } })
                      }
                      placeholder="{{apiKey}}"
                    />
                  </div>
                )}
                {draft.auth.type === "basic" && (
                  <div className="grid gap-2">
                    <Input
                      aria-label="Username"
                      value={draft.auth.username ?? ""}
                      onChange={(e) =>
                        onDraftChange({
                          ...draft,
                          auth: { ...draft.auth, username: e.target.value },
                        })
                      }
                      placeholder="{{username}}"
                    />
                    <SecretInput
                      aria-label="Password"
                      value={draft.auth.password ?? ""}
                      onChange={(password) =>
                        onDraftChange({ ...draft, auth: { ...draft.auth, password } })
                      }
                      placeholder="{{password}}"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const responsePanel = (
    <div className="flex h-full flex-col bg-bg-surface">
      {!response ? (
        <EmptyState
          title="No response yet"
          description="Send a request to inspect the response."
        />
      ) : (
        <>
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
              <Button variant="ghost" size="sm">
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
          <div className="min-h-0 flex-1 overflow-auto">
            {responseTab === "body" ? (
              <pre className="p-3 font-mono text-[0.8125rem] leading-5 text-text-primary whitespace-pre-wrap">
                {response.body || "This response has no body."}
              </pre>
            ) : (
              <table className="w-full text-left text-[0.8125rem]">
                <thead className="bg-bg-subtle text-text-muted">
                  <tr>
                    <th className="px-3 py-1.5 font-medium">Key</th>
                    <th className="px-3 py-1.5 font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {response.headers.map((h) => (
                    <tr key={`${h.key}-${h.value}`} className="border-t border-border-subtle">
                      <td className="px-3 py-1.5 font-mono text-accent">{h.key}</td>
                      <td className="px-3 py-1.5 font-mono text-text-secondary">{h.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border-subtle bg-bg-surface px-3 py-2">
        <MethodBadge method={draft.method} />
        <span className="text-[0.8125rem] text-text-secondary">
          {draft.name ?? "Untitled Request"}
        </span>
      </div>
      <SplitPanel top={requestPanel} bottom={responsePanel} />
    </div>
  );
}

function PairEditor({
  pairs,
  onChange,
  addLabel,
}: {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
  addLabel: string;
}) {
  return (
    <div>
      {pairs.map((pair) => (
        <KeyValueRow
          key={pair.id}
          enabled={pair.enabled}
          keyName={pair.key}
          value={pair.value}
          onEnabledChange={(enabled) => onChange(updatePairs(pairs, pair.id, { enabled }))}
          onKeyChange={(key) => onChange(updatePairs(pairs, pair.id, { key }))}
          onValueChange={(value) => onChange(updatePairs(pairs, pair.id, { value }))}
          onRemove={() => onChange(pairs.filter((p) => p.id !== pair.id))}
        />
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="mt-1"
        onClick={() =>
          onChange([
            ...pairs,
            {
              id: crypto.randomUUID(),
              key: "",
              value: "",
              enabled: true,
            },
          ])
        }
      >
        {addLabel}
      </Button>
    </div>
  );
}
