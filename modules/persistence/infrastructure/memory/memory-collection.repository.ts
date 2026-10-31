import type { Collection } from "@modules/project";
import type { CollectionRepository } from "@modules/project/ports/collection.repository";

export class MemoryCollectionRepository implements CollectionRepository {
  private readonly byId = new Map<string, Collection>();

  async listByProjectId(projectId: string): Promise<Collection[]> {
    return [...this.byId.values()]
      .filter((c) => c.projectId === projectId && c.deletedAt == null)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt))
      .map((c) => structuredClone(c));
  }

  async getById(id: string): Promise<Collection | null> {
    const found = this.byId.get(id);
    return found ? structuredClone(found) : null;
  }

  async save(collection: Collection): Promise<Collection> {
    this.byId.set(collection.id, structuredClone(collection));
    return structuredClone(collection);
  }

  async softDelete(id: string, deletedAt: string): Promise<void> {
    const existing = this.byId.get(id);
    if (!existing) return;
    this.byId.set(id, { ...existing, deletedAt, updatedAt: deletedAt });
  }
}
