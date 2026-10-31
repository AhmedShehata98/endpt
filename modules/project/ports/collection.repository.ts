import type { Collection } from "../types/project.types";

export interface CollectionRepository {
  listByProjectId(projectId: string): Promise<Collection[]>;
  /** Includes soft-deleted rows for sync push/merge. */
  listByProjectIdForSync(projectId: string): Promise<Collection[]>;
  getById(id: string): Promise<Collection | null>;
  save(collection: Collection): Promise<Collection>;
  softDelete(id: string, deletedAt: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
}
