import type { UserAccount } from "@modules/account";
import type { UserAccountRepository } from "@modules/account/ports/user-account.repository";

export class MemoryUserAccountRepository implements UserAccountRepository {
  private readonly byId = new Map<string, UserAccount>();

  async getById(id: string): Promise<UserAccount | null> {
    const found = this.byId.get(id);
    return found ? structuredClone(found) : null;
  }

  async getByEmail(email: string): Promise<UserAccount | null> {
    const lower = email.toLowerCase();
    for (const account of this.byId.values()) {
      if (account.deletedAt == null && account.email.toLowerCase() === lower) {
        return structuredClone(account);
      }
    }
    return null;
  }

  async save(account: UserAccount): Promise<UserAccount> {
    this.byId.set(account.id, structuredClone(account));
    return structuredClone(account);
  }

  async softDelete(id: string, deletedAt: string): Promise<void> {
    const existing = this.byId.get(id);
    if (!existing) return;
    this.byId.set(id, { ...existing, deletedAt, updatedAt: deletedAt });
  }
}
