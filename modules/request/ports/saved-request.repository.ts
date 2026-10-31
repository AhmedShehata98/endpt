import type { SavedRequest } from "../types/http.types";

export interface SavedRequestRepository {
  listByCollectionId(collectionId: string): Promise<SavedRequest[]>;
  getById(id: string): Promise<SavedRequest | null>;
  save(request: SavedRequest): Promise<SavedRequest>;
  softDelete(id: string, deletedAt: string): Promise<void>;
}
