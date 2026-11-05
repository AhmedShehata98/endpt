import { isTauri } from "@tauri-apps/api/core";
import { AccountService } from "@modules/account";
import { ProjectService } from "@modules/project";
import { FetchHttpClient, RequestService, TauriHttpClient } from "@modules/request";
import {
  createAppRepositories,
  createMemoryRepositories,
  createPasswordHasher,
  type AppRepositories,
} from "@modules/persistence";
import {
  FakeSyncRemote,
  SyncService,
  createDefaultSyncRemote,
  createSyncKeyStore,
  type SyncRemote,
} from "@modules/sync";
import {
  FakeTeamRemote,
  FirestoreTeamRemote,
  TeamService,
  createDefaultTeamRemote,
} from "@modules/team";
import { readFirebaseWebConfig } from "@modules/sync/infrastructure/firebase-sync-remote";

let reposPromise: Promise<AppRepositories> | null = null;

/** True when Playwright drives the Vite app (`VITE_E2E=1`). */
export function isE2eMode(): boolean {
  return import.meta.env.VITE_E2E === "1";
}

export function getAppRepositories(): Promise<AppRepositories> {
  if (!reposPromise) {
    reposPromise = isE2eMode()
      ? Promise.resolve(createMemoryRepositories())
      : createAppRepositories();
  }
  return reposPromise;
}

/** Test helper: replace the composition root with in-memory repositories. */
export function resetAppRepositoriesForTests(repos?: AppRepositories): void {
  reposPromise = Promise.resolve(repos ?? createMemoryRepositories());
}

export function createRequestService(): RequestService {
  const http = isTauri() && !isE2eMode() ? new TauriHttpClient() : new FetchHttpClient();
  return new RequestService(http);
}

export function createAccountService(repos: AppRepositories): AccountService {
  return new AccountService(
    repos.userAccounts,
    repos.sessions,
    repos.userSettings,
    createPasswordHasher(),
  );
}

export function createProjectService(repos: AppRepositories): ProjectService {
  return new ProjectService(repos.projects, repos.collections, repos.savedRequests);
}

export function createSyncService(
  repos: AppRepositories,
  remote?: SyncRemote,
): SyncService {
  const resolved =
    remote ?? (isE2eMode() ? new FakeSyncRemote() : createDefaultSyncRemote());
  return new SyncService(
    resolved,
    createSyncKeyStore(),
    repos.userAccounts,
    repos.sessions,
    repos.userSettings,
    repos.projects,
    repos.collections,
    repos.savedRequests,
    repos.environmentVariables,
    createPasswordHasher(),
  );
}

/** Spark-compatible: client Firestore. No Cloud Functions / Blaze required. */
export function createTeamService(userId?: string): TeamService {
  if (isE2eMode() || !readFirebaseWebConfig()) {
    return new TeamService(new FakeTeamRemote(userId ?? "local-user"));
  }
  return new TeamService(new FirestoreTeamRemote());
}

export { createDefaultTeamRemote };
