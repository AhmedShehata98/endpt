export type EnvVarRole = "authToken" | "apiKey" | "username" | "password" | "baseUrl";

export interface EnvironmentVariable {
  id: string;
  userId: string | null;
  key: string;
  value: string;
  role: EnvVarRole;
  updatedAt: string;
  deletedAt: string | null;
}

export const ENV_VAR_ROLE_DEFAULT_KEYS: Record<EnvVarRole, string> = {
  authToken: "authToken",
  apiKey: "apiKey",
  username: "username",
  password: "password",
  baseUrl: "baseUrl",
};

export const SECRET_ENV_ROLES: ReadonlySet<EnvVarRole> = new Set([
  "authToken",
  "apiKey",
  "username",
  "password",
]);
