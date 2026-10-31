import Database from "@tauri-apps/plugin-sql";

export const ENDPT_DB_URL = "sqlite:endpt.db";

export type SqlDatabase = Database;

let cached: Promise<SqlDatabase> | null = null;

export function loadEndptDatabase(): Promise<SqlDatabase> {
  if (!cached) {
    cached = Database.load(ENDPT_DB_URL);
  }
  return cached;
}

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
