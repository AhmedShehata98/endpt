export type {
  SyncStatus,
  SyncState,
  SyncEntityKind,
  SyncEnvelope,
  SyncRunResult,
} from "./types/sync.types";

export type { SyncRemote, CloudLinkResult } from "./ports/sync-remote.interface";
export type { SyncKeyStore } from "./ports/sync-key-store.interface";

export { SyncService, type SyncRunInput } from "./application/services/sync.service";
export { mergeByUpdatedAt, pickWinnerByUpdatedAt } from "./application/merge";
export {
  collectPurgeableIds,
  partitionLiveAndTombstones,
} from "./application/tombstones";
export {
  createSyncCipher,
  deriveSyncKeyMaterial,
  type SyncFieldCipher,
} from "./application/derive-sync-key";

export { FakeSyncRemote } from "./infrastructure/fake-sync-remote";
export { MemorySyncKeyStore } from "./infrastructure/memory-sync-key-store";
export {
  FirebaseSyncRemote,
  UnconfiguredSyncRemote,
  createDefaultSyncRemote,
  isFirebaseConfigured,
  readFirebaseWebConfig,
} from "./infrastructure/firebase-sync-remote";
export { createSyncKeyStore } from "./infrastructure/create-sync-key-store";
export { TauriSyncKeyStore } from "./infrastructure/tauri-sync-key-store";
