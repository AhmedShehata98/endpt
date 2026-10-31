import type { UserAccount } from "../types/account.types";

export interface UserAccountRepository {
  getById(id: string): Promise<UserAccount | null>;
  getByEmail(email: string): Promise<UserAccount | null>;
  save(account: UserAccount): Promise<UserAccount>;
  softDelete(id: string, deletedAt: string): Promise<void>;
}
