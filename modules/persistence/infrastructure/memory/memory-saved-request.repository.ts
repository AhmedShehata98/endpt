import type { SavedRequest } from "@modules/request";
import type { SavedRequestRepository } from "@modules/request/ports/saved-request.repository";

export class MemorySavedRequestRepository implements SavedRequestRepository {
  private readonly byId = new Map<string, SavedRequest>();

  async listByCollectionId(collectionId: string): Promise<SavedRequest[]> {
    return [...this.byId.values()]
      .filter((r) => r.collectionId === collectionId && r.deletedAt == null)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt))
      .map((r) => structuredClone(r));
  }

  async listByCollectionIdForSync(collectionId: string): Promise<SavedRequest[]> {
    return [...this.byId.values()]
      .filter((r) => r.collectionId === collectionId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt))
      .map((r) => structuredClone(r));
  }

  async getById(id: string): Promise<SavedRequest | null> {
    const found = this.byId.get(id);
    return found ? structuredClone(found) : null;
  }

  async save(request: SavedRequest): Promise<SavedRequest> {
    this.byId.set(request.id, structuredClone(request));
    return structuredClone(request);
  }

  async softDelete(id: string, deletedAt: string): Promise<void> {
    const existing = this.byId.get(id);
    if (!existing) return;
    this.byId.set(id, { ...existing, deletedAt, updatedAt: deletedAt });
  }

  async hardDelete(id: string): Promise<void> {
    this.byId.delete(id);
  }
}
