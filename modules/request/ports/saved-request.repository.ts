import type { SavedRequest } from "../types/http.types";

export interface SavedRequestRepository {
  listByCollectionId(collectionId: string): Promise<SavedRequest[]>;
  /** Includes soft-deleted rows for sync push/merge. */
  listByCollectionIdForSync(collectionId: string): Promise<SavedRequest[]>;
  getById(id: string): Promise<SavedRequest | null>;
  save(request: SavedRequest): Promise<SavedRequest>;
  softDelete(id: string, deletedAt: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
}
