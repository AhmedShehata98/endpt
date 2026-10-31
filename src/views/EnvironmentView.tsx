import { Button, SecretInput } from "@/components";
import {
  ENV_VAR_ROLE_DEFAULT_KEYS,
  ENV_VAR_ROLE_LABELS,
  ENV_VAR_ROLES,
  SECRET_ENV_ROLES,
  type EnvironmentVariable,
  type EnvVarRole,
} from "@modules/environment";

interface EnvironmentViewProps {
  variables: EnvironmentVariable[];
  onVariablesChange: (variables: EnvironmentVariable[]) => void;
}

export function EnvironmentView({ variables, onVariablesChange }: EnvironmentViewProps) {
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
            const used = new Set(variables.map((variable) => variable.role));
            const role: EnvVarRole =
              ENV_VAR_ROLES.find((candidate) => !used.has(candidate)) ?? "baseUrl";
            onVariablesChange([
              ...variables,
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
            {variables.map((row) => {
              const secret = SECRET_ENV_ROLES.has(row.role);
              return (
                <tr key={row.id} className="border-t border-border-subtle">
                  <td className="px-4 py-2 text-text-secondary">
                    {ENV_VAR_ROLE_LABELS[row.role]}
                  </td>
                  <td className="px-4 py-2 font-mono text-accent">{row.key}</td>
                  <td className="px-4 py-2">
                    {secret ? (
                      <SecretInput
                        aria-label={`${row.key} value`}
                        value={row.value}
                        onChange={(value) =>
                          onVariablesChange(
                            variables.map((variable) =>
                              variable.id === row.id ? { ...variable, value } : variable,
                            ),
                          )
                        }
                      />
                    ) : (
                      <input
                        className="h-8 w-full rounded-md border border-border-default bg-bg-surface px-2 font-mono text-[0.8125rem]"
                        value={row.value}
                        onChange={(e) =>
                          onVariablesChange(
                            variables.map((variable) =>
                              variable.id === row.id
                                ? { ...variable, value: e.target.value }
                                : variable,
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
                      onClick={() =>
                        onVariablesChange(variables.filter((variable) => variable.id !== row.id))
                      }
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
