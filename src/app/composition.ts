import { isTauri } from "@tauri-apps/api/core";
import { FetchHttpClient, RequestService, TauriHttpClient } from "@modules/request";
import {
  createAppRepositories,
  createMemoryRepositories,
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
