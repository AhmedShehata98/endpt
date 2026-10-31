import type { UserAccount, UserSettings } from "@modules/account";
import type { SessionRepository } from "@modules/account/ports/session.repository";
import type { UserAccountRepository } from "@modules/account/ports/user-account.repository";
import type { UserSettingsRepository } from "@modules/account/ports/user-settings.repository";
import type { PasswordHasher } from "@modules/account/ports/password-hasher.interface";
import type { EnvironmentVariable } from "@modules/environment";
import type { EnvironmentVariableRepository } from "@modules/environment/ports/environment-variable.repository";
import type { Collection, Project } from "@modules/project";
import type { CollectionRepository } from "@modules/project/ports/collection.repository";
import type { ProjectRepository } from "@modules/project/ports/project.repository";
import type { SavedRequest } from "@modules/request";
import type { SavedRequestRepository } from "@modules/request/ports/saved-request.repository";
import { createSyncCipher, deriveSyncKeyMaterial, type SyncFieldCipher } from "../derive-sync-key";
import { mergeByUpdatedAt } from "../merge";
import {
  decryptEnvFromSync,
  decryptSavedRequestFromSync,
  encryptEnvForSync,
  encryptSavedRequestForSync,
} from "../sync-secrets";
import type { SyncKeyStore } from "../../ports/sync-key-store.interface";
import type { SyncRemote } from "../../ports/sync-remote.interface";
import type { SyncEnvelope, SyncEntityKind, SyncRunResult } from "../../types/sync.types";

export type SyncRunInput = {
  account: Pick<UserAccount, "id" | "email" | "cloudUserId" | "lastSyncedAt">;
  syncEnabled: boolean;
  online: boolean;
  /** Required when cloud is not linked or sync key is missing. */
  password?: string;
};

export class SyncService {
  constructor(
    private readonly remote: SyncRemote,
    private readonly keyStore: SyncKeyStore,
    private readonly accounts: UserAccountRepository,
    private readonly sessions: SessionRepository,
    private readonly settings: UserSettingsRepository,
    private readonly projects: ProjectRepository,
    private readonly collections: CollectionRepository,
    private readonly savedRequests: SavedRequestRepository,
    private readonly environmentVariables: EnvironmentVariableRepository,
    private readonly hasher: PasswordHasher,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async run(input: SyncRunInput): Promise<SyncRunResult> {
    if (!input.syncEnabled) {
      return { kind: "skipped", status: "local-only", message: null };
    }
    if (!input.online) {
      return { kind: "skipped", status: "offline", message: "Network unavailable" };
    }
    if (!this.remote.isConfigured()) {
      return {
        kind: "failed",
        message: "Firebase is not configured. Set VITE_FIREBASE_* env vars.",
      };
    }

    try {
      const account = await this.accounts.getById(input.account.id);
      if (!account) {
        return { kind: "failed", message: "Account not found" };
      }

      let cloudUserId = account.cloudUserId;
      let cipher: SyncFieldCipher;

      const storedKey = await this.keyStore.load(account.id);
      if (!cloudUserId || !storedKey) {
        if (!input.password) {
          return { kind: "needs-password" };
        }
        const ok = await this.hasher.verify(input.password, account.passwordHash);
        if (!ok) {
          return { kind: "failed", message: "Password does not match this account" };
        }

        const link = await this.remote.linkAccount(account.email, input.password);
        cloudUserId = link.cloudUserId;
        await this.persistCloudLink(account, link.cloudUserId, link.accessToken);

        const keyMaterial = await deriveSyncKeyMaterial(input.password, account.id);
        await this.keyStore.save(account.id, keyMaterial);
        cipher = await createSyncCipher(keyMaterial);
      } else {
        const session = await this.remote.ensureSession();
        if (!session) {
          if (!input.password) {
            return { kind: "needs-password" };
          }
          const ok = await this.hasher.verify(input.password, account.passwordHash);
          if (!ok) {
            return { kind: "failed", message: "Password does not match this account" };
          }
          const link = await this.remote.linkAccount(account.email, input.password);
          cloudUserId = link.cloudUserId;
          await this.persistCloudLink(account, link.cloudUserId, link.accessToken);
        } else if (session.accessToken) {
          await this.updateSessionToken(account.id, session.accessToken);
        }
        cipher = await createSyncCipher(storedKey);
      }

      const since = account.lastSyncedAt;
      const remoteEnvelopes = await this.remote.pull(cloudUserId, since);
      await this.applyRemote(remoteEnvelopes, cipher);

      const localEnvelopes = await this.collectLocal(account.id, cipher);
      await this.remote.push(cloudUserId, localEnvelopes);

      const tombstones = localEnvelopes.filter((e) => e.deletedAt != null);
      if (tombstones.length > 0) {
        await this.remote.purgeRemote(cloudUserId, tombstones);
        await this.purgeLocal(tombstones);
      }

      const lastSyncedAt = this.now();
      const latest = await this.accounts.getById(account.id);
      if (latest) {
        await this.accounts.save({
          ...latest,
          lastSyncedAt,
          updatedAt: lastSyncedAt,
        });
      }

      return { kind: "ok", lastSyncedAt, cloudUserId };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      return { kind: "failed", message };
    }
  }

  private async persistCloudLink(
    account: UserAccount,
    cloudUserId: string,
    accessToken: string,
  ): Promise<void> {
    const now = this.now();
    await this.accounts.save({
      ...account,
      cloudUserId,
      updatedAt: now,
    });
    await this.updateSessionToken(account.id, accessToken);
  }

  private async updateSessionToken(userId: string, accessToken: string): Promise<void> {
    const session = await this.sessions.getActive();
    if (!session || session.userId !== userId) return;
    await this.sessions.save({ ...session, accessToken });
  }

  private async collectLocal(
    userId: string,
    cipher: SyncFieldCipher,
  ): Promise<SyncEnvelope[]> {
    const envelopes: SyncEnvelope[] = [];

    const settings = await this.settings.getByUserIdForSync(userId);
    if (settings) {
      envelopes.push(toEnvelope("settings", settings.id, settings.updatedAt, settings.deletedAt, {
        ...settings,
      }));
    }

    const projects = await this.projects.listByUserIdForSync(userId);
    for (const project of projects) {
      envelopes.push(
        toEnvelope("project", project.id, project.updatedAt, project.deletedAt, { ...project }),
      );

      const collections = await this.collections.listByProjectIdForSync(project.id);
      for (const collection of collections) {
        envelopes.push(
          toEnvelope("collection", collection.id, collection.updatedAt, collection.deletedAt, {
            ...collection,
          }),
        );

        const requests = await this.savedRequests.listByCollectionIdForSync(collection.id);
        for (const request of requests) {
          const encrypted = await encryptSavedRequestForSync(request, cipher);
          envelopes.push(
            toEnvelope(
              "savedRequest",
              encrypted.id,
              encrypted.updatedAt,
              encrypted.deletedAt,
              { ...encrypted },
            ),
          );
        }
      }
    }

    const envVars = await this.environmentVariables.listByUserIdForSync(userId);
    for (const variable of envVars) {
      const encrypted = await encryptEnvForSync(variable, cipher);
      envelopes.push(
        toEnvelope(
          "environmentVariable",
          encrypted.id,
          encrypted.updatedAt,
          encrypted.deletedAt,
          { ...encrypted },
        ),
      );
    }

    return envelopes;
  }

  private async applyRemote(
    envelopes: SyncEnvelope[],
    cipher: SyncFieldCipher,
  ): Promise<void> {
    for (const envelope of envelopes) {
      switch (envelope.kind) {
        case "settings": {
          const remote = envelope.payload as unknown as UserSettings;
          const local = await this.settings.getByUserIdForSync(remote.userId);
          const winner = mergeByUpdatedAt(local, remote);
          await this.settings.save(winner);
          break;
        }
        case "project": {
          const remote = envelope.payload as unknown as Project;
          const local = await this.projects.getById(remote.id);
          await this.projects.save(mergeByUpdatedAt(local, remote));
          break;
        }
        case "collection": {
          const remote = envelope.payload as unknown as Collection;
          const local = await this.collections.getById(remote.id);
          await this.collections.save(mergeByUpdatedAt(local, remote));
          break;
        }
        case "savedRequest": {
          const remoteEncrypted = envelope.payload as unknown as SavedRequest;
          const remote = await decryptSavedRequestFromSync(remoteEncrypted, cipher);
          const local = await this.savedRequests.getById(remote.id);
          await this.savedRequests.save(mergeByUpdatedAt(local, remote));
          break;
        }
        case "environmentVariable": {
          const remoteEncrypted = envelope.payload as unknown as EnvironmentVariable;
          const remote = await decryptEnvFromSync(remoteEncrypted, cipher);
          const local = await this.environmentVariables.getById(remote.id);
          await this.environmentVariables.save(mergeByUpdatedAt(local, remote));
          break;
        }
      }
    }
  }

  private async purgeLocal(envelopes: SyncEnvelope[]): Promise<void> {
    for (const envelope of envelopes) {
      switch (envelope.kind) {
        case "settings":
          await this.settings.hardDelete(envelope.id);
          break;
        case "project":
          await this.projects.hardDelete(envelope.id);
          break;
        case "collection":
          await this.collections.hardDelete(envelope.id);
          break;
        case "savedRequest":
          await this.savedRequests.hardDelete(envelope.id);
          break;
        case "environmentVariable":
          await this.environmentVariables.hardDelete(envelope.id);
          break;
      }
    }
  }
}

function toEnvelope(
  kind: SyncEntityKind,
  id: string,
  updatedAt: string,
  deletedAt: string | null,
  payload: Record<string, unknown>,
): SyncEnvelope {
  return { kind, id, updatedAt, deletedAt, payload };
}
