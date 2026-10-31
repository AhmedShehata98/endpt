/** Stores the password-derived sync encryption key material (device-local). */
export interface SyncKeyStore {
  save(userId: string, keyMaterial: string): Promise<void>;
  load(userId: string): Promise<string | null>;
  clear(userId: string): Promise<void>;
}
