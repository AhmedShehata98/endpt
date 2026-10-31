import {
  ENV_VAR_ROLE_DEFAULT_KEYS,
  ENV_VAR_ROLES,
  type EnvironmentVariable,
  type EnvVarRole,
} from "../types/environment.types";

export interface EnvVariableIssue {
  id: string;
  field: "key";
  message: string;
}

export function validateEnvVariables(
  variables: readonly EnvironmentVariable[],
): EnvVariableIssue[] {
  const active = variables.filter((variable) => variable.deletedAt === null);
  const byKey = new Map<string, string[]>();

  for (const variable of active) {
    const ids = byKey.get(variable.key) ?? [];
    ids.push(variable.id);
    byKey.set(variable.key, ids);
  }

  const issues: EnvVariableIssue[] = [];
  for (const [key, ids] of byKey) {
    if (ids.length < 2) continue;
    for (const id of ids) {
      issues.push({
        id,
        field: "key",
        message: `Key "${key}" is already in use`,
      });
    }
  }

  return issues;
}

export function unusedEnvRoles(
  variables: readonly EnvironmentVariable[],
): EnvVarRole[] {
  const used = new Set(
    variables
      .filter((variable) => variable.deletedAt === null)
      .map((variable) => variable.role),
  );
  return ENV_VAR_ROLES.filter((role) => !used.has(role));
}

export function roleForDefaultKey(key: string): EnvVarRole | null {
  for (const role of ENV_VAR_ROLES) {
    if (ENV_VAR_ROLE_DEFAULT_KEYS[role] === key) return role;
  }
  return null;
}
