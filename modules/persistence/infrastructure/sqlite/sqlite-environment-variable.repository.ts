import type { EnvironmentVariable, EnvVarRole } from "@modules/environment";
import {
  DuplicateEnvKeyError,
  type EnvironmentVariableRepository,
} from "@modules/environment/ports/environment-variable.repository";
import type { SecretCipher } from "../../ports/secret-cipher.interface";
import type { SqlDatabase } from "./database";

interface EnvRow {
  id: string;
  user_id: string | null;
  key: string;
  value_ciphertext: string;
  role: EnvVarRole;
  updated_at: string;
  deleted_at: string | null;
}

export class SqliteEnvironmentVariableRepository implements EnvironmentVariableRepository {
  constructor(
    private readonly db: SqlDatabase,
    private readonly cipher: SecretCipher,
  ) {}

  async listByUserId(userId: string | null): Promise<EnvironmentVariable[]> {
    const rows =
      userId == null
        ? await this.db.select<EnvRow[]>(
            `SELECT id, user_id, key, value_ciphertext, role, updated_at, deleted_at
             FROM environment_variables
             WHERE user_id IS NULL AND deleted_at IS NULL
             ORDER BY key ASC`,
          )
        : await this.db.select<EnvRow[]>(
            `SELECT id, user_id, key, value_ciphertext, role, updated_at, deleted_at
             FROM environment_variables
             WHERE user_id = $1 AND deleted_at IS NULL
             ORDER BY key ASC`,
            [userId],
          );

    return Promise.all(rows.map((row) => this.fromRow(row)));
  }

  async listByUserIdForSync(userId: string | null): Promise<EnvironmentVariable[]> {
    const rows =
      userId == null
        ? await this.db.select<EnvRow[]>(
            `SELECT id, user_id, key, value_ciphertext, role, updated_at, deleted_at
             FROM environment_variables
             WHERE user_id IS NULL
             ORDER BY key ASC`,
          )
        : await this.db.select<EnvRow[]>(
            `SELECT id, user_id, key, value_ciphertext, role, updated_at, deleted_at
             FROM environment_variables
             WHERE user_id = $1
             ORDER BY key ASC`,
            [userId],
          );

    return Promise.all(rows.map((row) => this.fromRow(row)));
  }

  async getById(id: string): Promise<EnvironmentVariable | null> {
    const rows = await this.db.select<EnvRow[]>(
      `SELECT id, user_id, key, value_ciphertext, role, updated_at, deleted_at
       FROM environment_variables WHERE id = $1 LIMIT 1`,
      [id],
    );
    const row = rows[0];
    return row ? this.fromRow(row) : null;
  }

  async save(variable: EnvironmentVariable): Promise<EnvironmentVariable> {
    await this.assertUniqueKey(variable);
    const valueCiphertext = await this.cipher.encrypt(variable.value);

    await this.db.execute(
      `INSERT INTO environment_variables
         (id, user_id, key, value_ciphertext, role, updated_at, deleted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT(id) DO UPDATE SET
         user_id = excluded.user_id,
         key = excluded.key,
         value_ciphertext = excluded.value_ciphertext,
         role = excluded.role,
         updated_at = excluded.updated_at,
         deleted_at = excluded.deleted_at`,
      [
        variable.id,
        variable.userId,
        variable.key,
        valueCiphertext,
        variable.role,
        variable.updatedAt,
        variable.deletedAt,
      ],
    );

    return variable;
  }

  async softDelete(id: string, deletedAt: string): Promise<void> {
    await this.db.execute(
      "UPDATE environment_variables SET deleted_at = $1, updated_at = $1 WHERE id = $2",
      [deletedAt, id],
    );
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.execute("DELETE FROM environment_variables WHERE id = $1", [id]);
  }

  private async assertUniqueKey(variable: EnvironmentVariable): Promise<void> {
    const rows =
      variable.userId == null
        ? await this.db.select<{ id: string }[]>(
            `SELECT id FROM environment_variables
             WHERE user_id IS NULL AND key = $1 AND deleted_at IS NULL AND id != $2
             LIMIT 1`,
            [variable.key, variable.id],
          )
        : await this.db.select<{ id: string }[]>(
            `SELECT id FROM environment_variables
             WHERE user_id = $1 AND key = $2 AND deleted_at IS NULL AND id != $3
             LIMIT 1`,
            [variable.userId, variable.key, variable.id],
          );

    if (rows[0]) {
      throw new DuplicateEnvKeyError(variable.key);
    }
  }

  private async fromRow(row: EnvRow): Promise<EnvironmentVariable> {
    return {
      id: row.id,
      userId: row.user_id,
      key: row.key,
      value: await this.cipher.decrypt(row.value_ciphertext),
      role: row.role,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    };
  }
}
