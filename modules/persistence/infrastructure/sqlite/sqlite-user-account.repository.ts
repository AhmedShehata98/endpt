import type { UserAccount } from "@modules/account";
import type { UserAccountRepository } from "@modules/account/ports/user-account.repository";
import type { SqlDatabase } from "./database";

interface AccountRow {
  id: string;
  email: string;
  display_name: string | null;
  password_hash: string;
  cloud_user_id: string | null;
  created_at: string;
  updated_at: string;
  last_synced_at: string | null;
  deleted_at: string | null;
}

const ACCOUNT_COLUMNS =
  "id, email, display_name, password_hash, cloud_user_id, created_at, updated_at, last_synced_at, deleted_at";

export class SqliteUserAccountRepository implements UserAccountRepository {
  constructor(private readonly db: SqlDatabase) {}

  async getById(id: string): Promise<UserAccount | null> {
    const rows = await this.db.select<AccountRow[]>(
      `SELECT ${ACCOUNT_COLUMNS} FROM user_accounts WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ? fromRow(rows[0]) : null;
  }

  async getByEmail(email: string): Promise<UserAccount | null> {
    const rows = await this.db.select<AccountRow[]>(
      `SELECT ${ACCOUNT_COLUMNS}
       FROM user_accounts
       WHERE lower(email) = lower($1) AND deleted_at IS NULL
       LIMIT 1`,
      [email],
    );
    return rows[0] ? fromRow(rows[0]) : null;
  }

  async save(account: UserAccount): Promise<UserAccount> {
    await this.db.execute(
      `INSERT INTO user_accounts
         (id, email, display_name, password_hash, cloud_user_id, created_at, updated_at, last_synced_at, deleted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT(id) DO UPDATE SET
         email = excluded.email,
         display_name = excluded.display_name,
         password_hash = excluded.password_hash,
         cloud_user_id = excluded.cloud_user_id,
         updated_at = excluded.updated_at,
         last_synced_at = excluded.last_synced_at,
         deleted_at = excluded.deleted_at`,
      [
        account.id,
        account.email,
        account.displayName,
        account.passwordHash,
        account.cloudUserId,
        account.createdAt,
        account.updatedAt,
        account.lastSyncedAt,
        account.deletedAt,
      ],
    );
    return account;
  }

  async softDelete(id: string, deletedAt: string): Promise<void> {
    await this.db.execute(
      "UPDATE user_accounts SET deleted_at = $1, updated_at = $1 WHERE id = $2",
      [deletedAt, id],
    );
  }
}

function fromRow(row: AccountRow): UserAccount {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    passwordHash: row.password_hash,
    cloudUserId: row.cloud_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastSyncedAt: row.last_synced_at,
    deletedAt: row.deleted_at,
  };
}
