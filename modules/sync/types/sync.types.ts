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

export type SyncEntityKind =
  | "settings"
  | "project"
  | "collection"
  | "savedRequest"
  | "environmentVariable";

/** Wire payload: secret fields already encrypted with the sync key. */
export interface SyncEnvelope {
  kind: SyncEntityKind;
  id: string;
  updatedAt: string;
  deletedAt: string | null;
  payload: Record<string, unknown>;
}

export type SyncRunResult =
  | { kind: "skipped"; status: SyncStatus; message: string | null }
  | { kind: "needs-password" }
  | { kind: "ok"; lastSyncedAt: string; cloudUserId: string }
  | { kind: "failed"; message: string };
