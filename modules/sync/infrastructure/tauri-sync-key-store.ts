import { invoke } from "@tauri-apps/api/core";
import type { SyncKeyStore } from "../ports/sync-key-store.interface";

export class TauriSyncKeyStore implements SyncKeyStore {
  async save(userId: string, keyMaterial: string): Promise<void> {
    await invoke("store_sync_key", { userId, keyMaterial });
  }

  async load(userId: string): Promise<string | null> {
    return invoke<string | null>("load_sync_key", { userId });
  }

  async clear(userId: string): Promise<void> {
    await invoke("clear_sync_key", { userId });
  }
}
