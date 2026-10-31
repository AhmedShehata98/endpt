import { isTauri } from "@tauri-apps/api/core";
import type { SyncKeyStore } from "../ports/sync-key-store.interface";
import { MemorySyncKeyStore } from "./memory-sync-key-store";
import { TauriSyncKeyStore } from "./tauri-sync-key-store";

export function createSyncKeyStore(): SyncKeyStore {
  return isTauri() ? new TauriSyncKeyStore() : new MemorySyncKeyStore();
}
