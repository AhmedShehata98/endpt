import type { CloudLinkResult, SyncRemote } from "../ports/sync-remote.interface";
import type { SyncEnvelope } from "../types/sync.types";

/** In-memory SyncRemote for unit tests. */
export class FakeSyncRemote implements SyncRemote {
  cloudUserId: string | null = null;
  accessToken: string | null = null;
  private readonly store = new Map<string, SyncEnvelope>();
  failNext = false;
  configured = true;

  isConfigured(): boolean {
    return this.configured;
  }

  async linkAccount(email: string, password: string): Promise<CloudLinkResult> {
    void password;
    if (this.failNext) {
      this.failNext = false;
      throw new Error("fake link failed");
    }
    this.cloudUserId = `cloud:${email}`;
    this.accessToken = `token:${email}`;
    return { cloudUserId: this.cloudUserId, accessToken: this.accessToken };
  }

  async ensureSession(): Promise<CloudLinkResult | null> {
    if (!this.cloudUserId || !this.accessToken) return null;
    return { cloudUserId: this.cloudUserId, accessToken: this.accessToken };
  }

  async pull(_cloudUserId: string, since: string | null): Promise<SyncEnvelope[]> {
    if (this.failNext) {
      this.failNext = false;
      throw new Error("fake pull failed");
    }
    const all = [...this.store.values()];
    if (!since) return all.map((e) => structuredClone(e));
    return all
      .filter((e) => e.updatedAt > since || (e.deletedAt != null && e.deletedAt > since))
      .map((e) => structuredClone(e));
  }

  async push(_cloudUserId: string, entities: SyncEnvelope[]): Promise<void> {
    if (this.failNext) {
      this.failNext = false;
      throw new Error("fake push failed");
    }
    for (const entity of entities) {
      this.store.set(`${entity.kind}:${entity.id}`, structuredClone(entity));
    }
  }

  async purgeRemote(_cloudUserId: string, entities: SyncEnvelope[]): Promise<void> {
    for (const entity of entities) {
      this.store.delete(`${entity.kind}:${entity.id}`);
    }
  }

  seed(entities: SyncEnvelope[]): void {
    for (const entity of entities) {
      this.store.set(`${entity.kind}:${entity.id}`, structuredClone(entity));
    }
  }

  all(): SyncEnvelope[] {
    return [...this.store.values()].map((e) => structuredClone(e));
  }
}
