export type {
  ThemePreference,
  UserAccount,
  Session,
  UserSettings,
} from "./types/account.types";
export { DEFAULT_USER_SETTINGS } from "./types/account.types";

export type { UserAccountRepository } from "./ports/user-account.repository";
export type { SessionRepository } from "./ports/session.repository";
export type { UserSettingsRepository } from "./ports/user-settings.repository";
export type { PasswordHasher } from "./ports/password-hasher.interface";

export {
  AccountService,
  toPublic,
  type PublicAccount,
  type AuthSuccess,
  type AuthFailure,
  type AuthResult,
  type RestoreResult,
} from "./application/services/account.service";
