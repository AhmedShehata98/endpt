export type SyncStatus =
  | "local-only"
  | "offline"
  | "syncing"
  | "synced"
  | "failed";

export interface SyncState {
  status: SyncStatus;
  lastSyncedAt: string | null;
  message: string | null;
}
