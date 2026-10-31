import { Input, SecretInput, Select } from "@/components";
import type { AuthType, RequestDraft } from "@modules/request";

interface AuthTabProps {
  draft: RequestDraft;
  onDraftChange: (draft: RequestDraft) => void;
}

export function AuthTab({ draft, onDraftChange }: AuthTabProps) {
  return (
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
  );
}
