import { Input, SecretInput, Select } from "@/components";
import type { AuthType, RequestDraft } from "@modules/request";
import { PlaceholderHints } from "./PlaceholderHints";

interface AuthTabProps {
  draft: RequestDraft;
  onDraftChange: (draft: RequestDraft) => void;
  envValues: ReadonlyMap<string, string>;
  onFixVariable: (key: string) => void;
}

export function AuthTab({
  draft,
  onDraftChange,
  envValues,
  onFixVariable,
}: AuthTabProps) {
  return (
    <div className="space-y-3 p-1">
      <label className="flex items-center gap-2 text-[0.8125rem] text-text-secondary">
        <input
          type="checkbox"
          checked={draft.auth.enabled}
          aria-label="Enable authentication"
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
            <div>
              <SecretInput
                aria-label="Token"
                value={draft.auth.token ?? ""}
                onChange={(token) =>
                  onDraftChange({ ...draft, auth: { ...draft.auth, token } })
                }
                placeholder="{{authToken}}"
              />
              <PlaceholderHints
                text={draft.auth.token ?? ""}
                envValues={envValues}
                onFixVariable={onFixVariable}
              />
            </div>
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
              <div>
                <SecretInput
                  aria-label="API key"
                  value={draft.auth.apiKey ?? ""}
                  onChange={(apiKey) =>
                    onDraftChange({ ...draft, auth: { ...draft.auth, apiKey } })
                  }
                  placeholder="{{apiKey}}"
                />
                <PlaceholderHints
                  text={draft.auth.apiKey ?? ""}
                  envValues={envValues}
                  onFixVariable={onFixVariable}
                />
              </div>
            </div>
          )}
          {draft.auth.type === "basic" && (
            <div className="grid gap-2">
              <div>
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
                <PlaceholderHints
                  text={draft.auth.username ?? ""}
                  envValues={envValues}
                  onFixVariable={onFixVariable}
                />
              </div>
              <div>
                <SecretInput
                  aria-label="Password"
                  value={draft.auth.password ?? ""}
                  onChange={(password) =>
                    onDraftChange({ ...draft, auth: { ...draft.auth, password } })
                  }
                  placeholder="{{password}}"
                />
                <PlaceholderHints
                  text={draft.auth.password ?? ""}
                  envValues={envValues}
                  onFixVariable={onFixVariable}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
