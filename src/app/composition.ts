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
