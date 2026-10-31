import type { EnvironmentVariable } from "@modules/environment";
import {
  DuplicateEnvKeyError,
  type EnvironmentVariableRepository,
} from "@modules/environment/ports/environment-variable.repository";

export class MemoryEnvironmentVariableRepository implements EnvironmentVariableRepository {
  private readonly byId = new Map<string, EnvironmentVariable>();

  async listByUserId(userId: string | null): Promise<EnvironmentVariable[]> {
    return [...this.byId.values()]
      .filter((v) => v.userId === userId && v.deletedAt == null)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((v) => structuredClone(v));
  }

  async getById(id: string): Promise<EnvironmentVariable | null> {
    const found = this.byId.get(id);
    return found ? structuredClone(found) : null;
  }

  async save(variable: EnvironmentVariable): Promise<EnvironmentVariable> {
    for (const existing of this.byId.values()) {
      if (
        existing.id !== variable.id &&
        existing.userId === variable.userId &&
        existing.key === variable.key &&
        existing.deletedAt == null
      ) {
        throw new DuplicateEnvKeyError(variable.key);
      }
    }
    this.byId.set(variable.id, structuredClone(variable));
    return structuredClone(variable);
  }

  async softDelete(id: string, deletedAt: string): Promise<void> {
    const existing = this.byId.get(id);
    if (!existing) return;
    this.byId.set(id, { ...existing, deletedAt, updatedAt: deletedAt });
  }
}
