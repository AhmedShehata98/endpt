import type { UserSettings } from "../types/account.types";

export interface UserSettingsRepository {
  getByUserId(userId: string): Promise<UserSettings | null>;
  /** Includes soft-deleted row when present. */
  getByUserIdForSync(userId: string): Promise<UserSettings | null>;
  save(settings: UserSettings): Promise<UserSettings>;
  softDelete(id: string, deletedAt: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
}