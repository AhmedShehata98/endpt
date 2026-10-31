import type { Session } from "../types/account.types";

export interface SessionRepository {
  getActive(): Promise<Session | null>;
  save(session: Session): Promise<Session>;
  delete(id: string): Promise<void>;
  clearAll(): Promise<void>;
}
