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
  SyncService,
  createDefaultSyncRemote,
  createSyncKeyStore,
  type SyncRemote,
} from "@modules/sync";

let reposPromise: Promise<AppRepositories> | null = null;

export function getAppRepositories(): Promise<AppRepositories> {
  if (!reposPromise) {
    reposPromise = createAppRepositories();
  }
  return reposPromise;
}

/** Test helper: replace the composition root with in-memory repositories. */
export function resetAppRepositoriesForTests(repos?: AppRepositories): void {
  reposPromise = Promise.resolve(repos ?? createMemoryRepositories());
}

export function createRequestService(): RequestService {
  const http = isTauri() ? new TauriHttpClient() : new FetchHttpClient();
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
  remote: SyncRemote = createDefaultSyncRemote(),
): SyncService {
  return new SyncService(
    remote,
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
