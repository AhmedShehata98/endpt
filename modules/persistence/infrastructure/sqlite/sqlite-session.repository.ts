import type { Session } from "@modules/account";
import type { SessionRepository } from "@modules/account/ports/session.repository";
import type { SqlDatabase } from "./database";

interface SessionRow {
  id: string;
  user_id: string;
  access_token: string | null;
  created_at: string;
  expires_at: string | null;
}

export class SqliteSessionRepository implements SessionRepository {
  constructor(private readonly db: SqlDatabase) {}

  async getActive(): Promise<Session | null> {
    const rows = await this.db.select<SessionRow[]>(
      `SELECT id, user_id, access_token, created_at, expires_at
       FROM sessions
       ORDER BY created_at DESC
       LIMIT 1`,
    );
    return rows[0] ? fromRow(rows[0]) : null;
  }

  async save(session: Session): Promise<Session> {
    await this.db.execute(
      `INSERT INTO sessions (id, user_id, access_token, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT(id) DO UPDATE SET
         user_id = excluded.user_id,
         access_token = excluded.access_token,
         expires_at = excluded.expires_at`,
      [
        session.id,
        session.userId,
        session.accessToken,
        session.createdAt,
        session.expiresAt,
      ],
    );
    return session;
  }

  async delete(id: string): Promise<void> {
    await this.db.execute("DELETE FROM sessions WHERE id = $1", [id]);
  }

  async clearAll(): Promise<void> {
    await this.db.execute("DELETE FROM sessions");
  }
}

function fromRow(row: SessionRow): Session {
  return {
    id: row.id,
    userId: row.user_id,
    accessToken: row.access_token,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}
