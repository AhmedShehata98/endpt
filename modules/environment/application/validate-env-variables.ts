import {
  ENV_VAR_ROLE_DEFAULT_KEYS,
  FIXED_ENV_VAR_ROLES,
  type EnvironmentVariable,
  type EnvVarRole,
} from "../types/environment.types";

export interface EnvVariableIssue {
  id: string;
  field: "key";
  message: string;
}

const ENV_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function isValidEnvKey(key: string): boolean {
  return ENV_KEY_PATTERN.test(key);
}

export function validateEnvVariables(
  variables: readonly EnvironmentVariable[],
): EnvVariableIssue[] {
  const active = variables.filter((variable) => variable.deletedAt === null);
  const byKey = new Map<string, string[]>();
  const issues: EnvVariableIssue[] = [];

  for (const variable of active) {
    if (variable.key.trim() === "") {
      issues.push({
        id: variable.id,
        field: "key",
        message: "Key is required",
      });
      continue;
    }

    if (!isValidEnvKey(variable.key)) {
      issues.push({
        id: variable.id,
        field: "key",
        message: `Key "${variable.key}" is invalid`,
      });
      continue;
    }

    const ids = byKey.get(variable.key) ?? [];
    ids.push(variable.id);
    byKey.set(variable.key, ids);
  }

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
  return FIXED_ENV_VAR_ROLES.filter((role) => !used.has(role));
}

export function roleForDefaultKey(key: string): EnvVarRole | null {
  for (const role of FIXED_ENV_VAR_ROLES) {
    if (ENV_VAR_ROLE_DEFAULT_KEYS[role] === key) return role;
  }
  return null;
}
