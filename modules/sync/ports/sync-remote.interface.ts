import type { SyncEnvelope } from "../types/sync.types";

export interface CloudLinkResult {
  cloudUserId: string;
  accessToken: string;
}

export interface SyncRemote {
  isConfigured(): boolean;
  linkAccount(email: string, password: string): Promise<CloudLinkResult>;
  ensureSession(): Promise<CloudLinkResult | null>;
  pull(cloudUserId: string, since: string | null): Promise<SyncEnvelope[]>;
  push(cloudUserId: string, entities: SyncEnvelope[]): Promise<void>;
  purgeRemote(cloudUserId: string, entities: SyncEnvelope[]): Promise<void>;
}
