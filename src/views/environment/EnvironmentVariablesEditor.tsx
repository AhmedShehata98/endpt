import { useEffect, useMemo, useRef } from "react";
import { Button, EmptyState, SecretInput } from "@/components";
import {
  ENV_VAR_ROLE_LABELS,
  SECRET_ENV_ROLES,
  validateEnvVariables,
  type EnvironmentVariable,
} from "@modules/environment";
import { cn } from "@/lib/cn";

interface EnvironmentVariablesEditorProps {
  variables: EnvironmentVariable[];
  onVariablesChange: (variables: EnvironmentVariable[]) => void;
  onAddVariable: () => void;
  addDisabled?: boolean;
  highlightKey?: string | null;
  showHeader?: boolean;
  className?: string;
}

export function EnvironmentVariablesEditor({
  variables,
  onVariablesChange,
  onAddVariable,
  addDisabled = false,
  highlightKey = null,
  showHeader = true,
  className,
}: EnvironmentVariablesEditorProps) {
  const issuesById = useMemo(() => {
    const map = new Map<string, string>();
    for (const issue of validateEnvVariables(variables)) {
      map.set(issue.id, issue.message);
    }
    return map;
  }, [variables]);

  const highlightRef = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    if (!highlightKey) return;
    highlightRef.current?.scrollIntoView({ block: "nearest" });
  }, [highlightKey, variables]);

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      {showHeader ? (
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border-default px-4">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Environment</h2>
            <p className="text-[0.75rem] text-text-muted">
              Encrypted on device. Synced only when sync is enabled.
            </p>
          </div>
          {variables.length > 0 ? (
            <Button
              variant="primary"
              size="sm"
              onClick={onAddVariable}
              disabled={addDisabled}
            >
              Add variable
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border-default px-3 py-2">
          <p className="text-[0.75rem] text-text-muted">
            Encrypted on device. Synced only when sync is enabled.
          </p>
          {variables.length > 0 ? (
            <Button
              variant="primary"
              size="sm"
              onClick={onAddVariable}
              disabled={addDisabled}
            >
              Add variable
            </Button>
          ) : null}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        {variables.length === 0 ? (
          <EmptyState
            title="No variables yet"
            description="Add an auth token, API key, username, password, or base URL to use in requests."
            action={
              <Button variant="primary" size="sm" onClick={onAddVariable} disabled={addDisabled}>
                Add variable
              </Button>
            }
          />
        ) : (
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
                const issue = issuesById.get(row.id);
                const highlighted = highlightKey !== null && row.key === highlightKey;

                return (
                  <tr
                    key={row.id}
                    ref={highlighted ? highlightRef : undefined}
                    className={cn(
                      "border-t border-border-subtle align-top",
                      highlighted && "bg-accent-subtle",
                    )}
                  >
                    <td className="px-4 py-2 text-text-secondary">
                      {ENV_VAR_ROLE_LABELS[row.role]}
                    </td>
                    <td className="px-4 py-2">
                      <span className="font-mono text-accent">{row.key}</span>
                      {issue ? (
                        <p className="mt-1 text-[0.75rem] text-error" role="alert">
                          {issue}
                        </p>
                      ) : null}
                    </td>
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
                        <div className="space-y-1">
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
                            placeholder="(empty)"
                          />
                          {row.value === "" ? (
                            <p className="text-[0.75rem] text-text-muted">(empty)</p>
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          onVariablesChange(
                            variables.filter((variable) => variable.id !== row.id),
                          )
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
        )}
      </div>
    </div>
  );
}
