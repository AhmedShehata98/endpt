import type { Session } from "@modules/account";
import type { SessionRepository } from "@modules/account/ports/session.repository";
import type { SecretCipher } from "../../ports/secret-cipher.interface";
import type { SqlDatabase } from "./database";

interface SessionRow {
  id: string;
  user_id: string;
  access_token: string | null;
  created_at: string;
  expires_at: string | null;
}

export class SqliteSessionRepository implements SessionRepository {
  constructor(
    private readonly db: SqlDatabase,
    private readonly cipher: SecretCipher,
  ) {}

  async getActive(): Promise<Session | null> {
    const rows = await this.db.select<SessionRow[]>(
      `SELECT id, user_id, access_token, created_at, expires_at
       FROM sessions
       ORDER BY created_at DESC
       LIMIT 1`,
    );
    return rows[0] ? this.fromRow(rows[0]) : null;
  }

  async save(session: Session): Promise<Session> {
    const accessToken =
      session.accessToken != null
        ? await this.cipher.encrypt(session.accessToken)
        : null;

    await this.db.execute(
      `INSERT INTO sessions (id, user_id, access_token, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT(id) DO UPDATE SET
         user_id = excluded.user_id,
         access_token = excluded.access_token,
         expires_at = excluded.expires_at`,
      [session.id, session.userId, accessToken, session.createdAt, session.expiresAt],
    );
    return session;
  }

  async delete(id: string): Promise<void> {
    await this.db.execute("DELETE FROM sessions WHERE id = $1", [id]);
  }

  async clearAll(): Promise<void> {
    await this.db.execute("DELETE FROM sessions");
  }

  private async fromRow(row: SessionRow): Promise<Session> {
    return {
      id: row.id,
      userId: row.user_id,
      accessToken:
        row.access_token != null
          ? await this.cipher.decrypt(row.access_token)
          : null,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    };
  }
}
