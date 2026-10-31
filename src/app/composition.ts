import { isTauri } from "@tauri-apps/api/core";
import { AccountService } from "@modules/account";
import { FetchHttpClient, RequestService, TauriHttpClient } from "@modules/request";
import {
  createAppRepositories,
  createMemoryRepositories,
  createPasswordHasher,
  type AppRepositories,
} from "@modules/persistence";

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
