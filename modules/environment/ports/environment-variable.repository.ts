import type { EnvironmentVariable } from "../types/environment.types";

export class DuplicateEnvKeyError extends Error {
  constructor(key: string) {
    super(`Environment variable key already exists: ${key}`);
    this.name = "DuplicateEnvKeyError";
  }
}

export interface EnvironmentVariableRepository {
  listByUserId(userId: string | null): Promise<EnvironmentVariable[]>;
  getById(id: string): Promise<EnvironmentVariable | null>;
  save(variable: EnvironmentVariable): Promise<EnvironmentVariable>;
  softDelete(id: string, deletedAt: string): Promise<void>;
}
