export type EnvVarRole =
  | "authToken"
  | "apiKey"
  | "username"
  | "password"
  | "baseUrl"
  | "custom";

export interface EnvironmentVariable {
  id: string;
  userId: string | null;
  key: string;
  value: string;
  role: EnvVarRole;
  updatedAt: string;
  deletedAt: string | null;
}

export const FIXED_ENV_VAR_ROLES: readonly EnvVarRole[] = [
  "authToken",
  "apiKey",
  "username",
  "password",
  "baseUrl",
] as const;

export const ENV_VAR_ROLES: readonly EnvVarRole[] = [
  ...FIXED_ENV_VAR_ROLES,
  "custom",
] as const;

export const ENV_VAR_ROLE_DEFAULT_KEYS: Record<EnvVarRole, string> = {
  authToken: "authToken",
  apiKey: "apiKey",
  username: "username",
  password: "password",
  baseUrl: "baseUrl",
  custom: "",
};

export const ENV_VAR_ROLE_LABELS: Record<EnvVarRole, string> = {
  authToken: "Auth token",
  apiKey: "API key",
  username: "Username",
  password: "Password",
  baseUrl: "Base URL",
  custom: "Custom",
};

export const SECRET_ENV_ROLES: ReadonlySet<EnvVarRole> = new Set([
  "authToken",
  "apiKey",
  "username",
  "password",
]);
