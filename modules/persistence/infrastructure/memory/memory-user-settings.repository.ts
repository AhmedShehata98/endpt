import type { UserSettings } from "@modules/account";
import type { UserSettingsRepository } from "@modules/account/ports/user-settings.repository";

export class MemoryUserSettingsRepository implements UserSettingsRepository {
  private readonly byId = new Map<string, UserSettings>();

  async getByUserId(userId: string): Promise<UserSettings | null> {
    for (const settings of this.byId.values()) {
      if (settings.userId === userId && settings.deletedAt == null) {
        return structuredClone(settings);
      }
    }
    return null;
  }

  async getByUserIdForSync(userId: string): Promise<UserSettings | null> {
    for (const settings of this.byId.values()) {
      if (settings.userId === userId) {
        return structuredClone(settings);
      }
    }
    return null;
  }

  async save(settings: UserSettings): Promise<UserSettings> {
    this.byId.set(settings.id, structuredClone(settings));
    return structuredClone(settings);
  }

  async softDelete(id: string, deletedAt: string): Promise<void> {
    const existing = this.byId.get(id);
    if (!existing) return;
    this.byId.set(id, { ...existing, deletedAt, updatedAt: deletedAt });
  }

  async hardDelete(id: string): Promise<void> {
    this.byId.delete(id);
  }
}
