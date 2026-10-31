import type { Session } from "@modules/account";
import type { SessionRepository } from "@modules/account/ports/session.repository";

export class MemorySessionRepository implements SessionRepository {
  private readonly byId = new Map<string, Session>();

  async getActive(): Promise<Session | null> {
    const sessions = [...this.byId.values()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
    return sessions[0] ? structuredClone(sessions[0]) : null;
  }

  async save(session: Session): Promise<Session> {
    this.byId.set(session.id, structuredClone(session));
    return structuredClone(session);
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id);
  }

  async clearAll(): Promise<void> {
    this.byId.clear();
  }
}
