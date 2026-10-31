import { useState } from "react";
import { Button, SecretInput } from "@/components";
import { MOCK_ENV_VARS } from "@/app/mock-data";
import {
  ENV_VAR_ROLE_DEFAULT_KEYS,
  SECRET_ENV_ROLES,
  type EnvironmentVariable,
  type EnvVarRole,
} from "@modules/environment";

const ROLES: EnvVarRole[] = ["authToken", "apiKey", "username", "password", "baseUrl"];

const ROLE_LABELS: Record<EnvVarRole, string> = {
  authToken: "Auth token",
  apiKey: "API key",
  username: "Username",
  password: "Password",
  baseUrl: "Base URL",
};

export function EnvironmentView() {
  const [vars, setVars] = useState<EnvironmentVariable[]>(MOCK_ENV_VARS);

  return (
    <div className="flex h-full flex-col bg-bg-surface">
      <div className="flex h-12 items-center justify-between border-b border-border-default px-4">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Environment</h2>
          <p className="text-[0.75rem] text-text-muted">
            Encrypted on device. Synced only when sync is enabled.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            const used = new Set(vars.map((v) => v.role));
            const role = ROLES.find((r) => !used.has(r)) ?? "baseUrl";
            setVars((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                userId: null,
                key: ENV_VAR_ROLE_DEFAULT_KEYS[role],
                value: "",
                role,
                updatedAt: new Date().toISOString(),
                deletedAt: null,
              },
            ]);
          }}
        >
          Add variable
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-left text-[0.8125rem]">
          <thead className="sticky top-0 bg-bg-subtle text-text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Key</th>
              <th className="px-4 py-2 font-medium">Value</th>
              <th className="w-20 px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {vars.map((row) => {
              const secret = SECRET_ENV_ROLES.has(row.role);
              return (
                <tr key={row.id} className="border-t border-border-subtle">
                  <td className="px-4 py-2 text-text-secondary">{ROLE_LABELS[row.role]}</td>
                  <td className="px-4 py-2 font-mono text-accent">{row.key}</td>
                  <td className="px-4 py-2">
                    {secret ? (
                      <SecretInput
                        aria-label={`${row.key} value`}
                        value={row.value}
                        onChange={(value) =>
                          setVars((prev) =>
                            prev.map((v) => (v.id === row.id ? { ...v, value } : v)),
                          )
                        }
                      />
                    ) : (
                      <input
                        className="h-8 w-full rounded-md border border-border-default bg-bg-surface px-2 font-mono text-[0.8125rem]"
                        value={row.value}
                        onChange={(e) =>
                          setVars((prev) =>
                            prev.map((v) =>
                              v.id === row.id ? { ...v, value: e.target.value } : v,
                            ),
                          )
                        }
                        aria-label={`${row.key} value`}
                      />
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setVars((prev) => prev.filter((v) => v.id !== row.id))}
                      aria-label={`Delete ${row.key}`}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
