import type { SyncKeyStore } from "../ports/sync-key-store.interface";

export class MemorySyncKeyStore implements SyncKeyStore {
  private readonly keys = new Map<string, string>();

  async save(userId: string, keyMaterial: string): Promise<void> {
    this.keys.set(userId, keyMaterial);
  }

  async load(userId: string): Promise<string | null> {
    return this.keys.get(userId) ?? null;
  }

  async clear(userId: string): Promise<void> {
    this.keys.delete(userId);
  }
}
