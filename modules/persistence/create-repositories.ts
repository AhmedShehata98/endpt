import type { SessionRepository } from "@modules/account/ports/session.repository";
import type { UserAccountRepository } from "@modules/account/ports/user-account.repository";
import type { UserSettingsRepository } from "@modules/account/ports/user-settings.repository";
import type { EnvironmentVariableRepository } from "@modules/environment/ports/environment-variable.repository";
import type { CollectionRepository } from "@modules/project/ports/collection.repository";
import type { ProjectRepository } from "@modules/project/ports/project.repository";
import type { AdHocRequestRepository } from "@modules/request/ports/ad-hoc-request.repository";
import type { SavedRequestRepository } from "@modules/request/ports/saved-request.repository";
import { MemoryAdHocRequestRepository } from "./infrastructure/memory/memory-ad-hoc-request.repository";
import { MemoryCollectionRepository } from "./infrastructure/memory/memory-collection.repository";
import { MemoryEnvironmentVariableRepository } from "./infrastructure/memory/memory-environment-variable.repository";
import { MemoryProjectRepository } from "./infrastructure/memory/memory-project.repository";
import { MemorySavedRequestRepository } from "./infrastructure/memory/memory-saved-request.repository";
import { MemorySessionRepository } from "./infrastructure/memory/memory-session.repository";
import { MemoryUserAccountRepository } from "./infrastructure/memory/memory-user-account.repository";
import { MemoryUserSettingsRepository } from "./infrastructure/memory/memory-user-settings.repository";
import { MemorySecretCipher } from "./infrastructure/secrets/memory-secret-cipher";
import { TauriSecretCipher } from "./infrastructure/secrets/tauri-secret-cipher";
import { isTauriRuntime, loadEndptDatabase } from "./infrastructure/sqlite/database";
import { SqliteAdHocRequestRepository } from "./infrastructure/sqlite/sqlite-ad-hoc-request.repository";
import { SqliteCollectionRepository } from "./infrastructure/sqlite/sqlite-collection.repository";
import { SqliteEnvironmentVariableRepository } from "./infrastructure/sqlite/sqlite-environment-variable.repository";
import { SqliteProjectRepository } from "./infrastructure/sqlite/sqlite-project.repository";
import { SqliteSavedRequestRepository } from "./infrastructure/sqlite/sqlite-saved-request.repository";
import { SqliteSessionRepository } from "./infrastructure/sqlite/sqlite-session.repository";
import { SqliteUserAccountRepository } from "./infrastructure/sqlite/sqlite-user-account.repository";
import { SqliteUserSettingsRepository } from "./infrastructure/sqlite/sqlite-user-settings.repository";
import type { SecretCipher } from "./ports/secret-cipher.interface";

export interface AppRepositories {
  backend: "sqlite" | "memory";
  cipher: SecretCipher;
  adHocRequests: AdHocRequestRepository;
  savedRequests: SavedRequestRepository;
  environmentVariables: EnvironmentVariableRepository;
  projects: ProjectRepository;
  collections: CollectionRepository;
  userAccounts: UserAccountRepository;
  sessions: SessionRepository;
  userSettings: UserSettingsRepository;
}

export function createMemoryRepositories(
  cipher: SecretCipher = new MemorySecretCipher(),
): AppRepositories {
  return {
    backend: "memory",
    cipher,
    adHocRequests: new MemoryAdHocRequestRepository(),
    savedRequests: new MemorySavedRequestRepository(),
    environmentVariables: new MemoryEnvironmentVariableRepository(),
    projects: new MemoryProjectRepository(),
    collections: new MemoryCollectionRepository(),
    userAccounts: new MemoryUserAccountRepository(),
    sessions: new MemorySessionRepository(),
    userSettings: new MemoryUserSettingsRepository(),
  };
}

/**
 * Desktop (Tauri): SQLite + keychain cipher. Failures propagate.
 * Vite-only / tests: in-memory (no disk).
 */
export async function createAppRepositories(): Promise<AppRepositories> {
  if (!isTauriRuntime()) {
    return createMemoryRepositories();
  }

  const db = await loadEndptDatabase();
  const cipher = new TauriSecretCipher();
  return {
    backend: "sqlite",
    cipher,
    adHocRequests: new SqliteAdHocRequestRepository(db, cipher),
    savedRequests: new SqliteSavedRequestRepository(db, cipher),
    environmentVariables: new SqliteEnvironmentVariableRepository(db, cipher),
    projects: new SqliteProjectRepository(db),
    collections: new SqliteCollectionRepository(db),
    userAccounts: new SqliteUserAccountRepository(db),
    sessions: new SqliteSessionRepository(db, cipher),
    userSettings: new SqliteUserSettingsRepository(db),
  };
}
