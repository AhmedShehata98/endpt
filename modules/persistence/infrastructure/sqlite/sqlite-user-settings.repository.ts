import type { ThemePreference, UserSettings } from "@modules/account";
import type { UserSettingsRepository } from "@modules/account/ports/user-settings.repository";
import type { HttpMethod } from "@modules/request";
import type { SqlDatabase } from "./database";

interface SettingsRow {
  id: string;
  user_id: string;
  theme: ThemePreference;
  default_http_method: HttpMethod;
  wrap_response_lines: number;
  sync_enabled: number;
  updated_at: string;
  deleted_at: string | null;
}

export class SqliteUserSettingsRepository implements UserSettingsRepository {
  constructor(private readonly db: SqlDatabase) {}

  async getByUserId(userId: string): Promise<UserSettings | null> {
    const rows = await this.db.select<SettingsRow[]>(
      `SELECT id, user_id, theme, default_http_method, wrap_response_lines, sync_enabled, updated_at, deleted_at
       FROM user_settings
       WHERE user_id = $1 AND deleted_at IS NULL
       LIMIT 1`,
      [userId],
    );
    return rows[0] ? fromRow(rows[0]) : null;
  }

  async getByUserIdForSync(userId: string): Promise<UserSettings | null> {
    const rows = await this.db.select<SettingsRow[]>(
      `SELECT id, user_id, theme, default_http_method, wrap_response_lines, sync_enabled, updated_at, deleted_at
       FROM user_settings
       WHERE user_id = $1
       LIMIT 1`,
      [userId],
    );
    return rows[0] ? fromRow(rows[0]) : null;
  }

  async save(settings: UserSettings): Promise<UserSettings> {
    await this.db.execute(
      `INSERT INTO user_settings
         (id, user_id, theme, default_http_method, wrap_response_lines, sync_enabled, updated_at, deleted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT(id) DO UPDATE SET
         user_id = excluded.user_id,
         theme = excluded.theme,
         default_http_method = excluded.default_http_method,
         wrap_response_lines = excluded.wrap_response_lines,
         sync_enabled = excluded.sync_enabled,
         updated_at = excluded.updated_at,
         deleted_at = excluded.deleted_at`,
      [
        settings.id,
        settings.userId,
        settings.theme,
        settings.defaultHttpMethod,
        settings.wrapResponseLines ? 1 : 0,
        settings.syncEnabled ? 1 : 0,
        settings.updatedAt,
        settings.deletedAt,
      ],
    );
    return settings;
  }

  async softDelete(id: string, deletedAt: string): Promise<void> {
    await this.db.execute(
      "UPDATE user_settings SET deleted_at = $1, updated_at = $1 WHERE id = $2",
      [deletedAt, id],
    );
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.execute("DELETE FROM user_settings WHERE id = $1", [id]);
  }
}

function fromRow(row: SettingsRow): UserSettings {
  return {
    id: row.id,
    userId: row.user_id,
    theme: row.theme,
    defaultHttpMethod: row.default_http_method,
    wrapResponseLines: Boolean(row.wrap_response_lines),
    syncEnabled: Boolean(row.sync_enabled),
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}
