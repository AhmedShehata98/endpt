export type { EnvVarRole, EnvironmentVariable } from "./types/environment.types";
export {
  ENV_VAR_ROLES,
  ENV_VAR_ROLE_DEFAULT_KEYS,
  ENV_VAR_ROLE_LABELS,
  SECRET_ENV_ROLES,
} from "./types/environment.types";

export type { EnvironmentVariableRepository } from "./ports/environment-variable.repository";
export { DuplicateEnvKeyError } from "./ports/environment-variable.repository";

export type { EnvBinding, ResolvedDraft } from "./application/resolve-draft";
export { resolveDraft } from "./application/resolve-draft";
