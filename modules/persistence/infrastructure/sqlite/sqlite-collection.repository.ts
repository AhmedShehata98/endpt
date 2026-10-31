import type { Collection } from "@modules/project";
import type { CollectionRepository } from "@modules/project/ports/collection.repository";
import type { SqlDatabase } from "./database";

interface CollectionRow {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class SqliteCollectionRepository implements CollectionRepository {
  constructor(private readonly db: SqlDatabase) {}

  async listByProjectId(projectId: string): Promise<Collection[]> {
    const rows = await this.db.select<CollectionRow[]>(
      `SELECT id, project_id, name, description, sort_order, created_at, updated_at, deleted_at
       FROM collections
       WHERE project_id = $1 AND deleted_at IS NULL
       ORDER BY sort_order ASC, created_at ASC`,
      [projectId],
    );
    return rows.map(fromRow);
  }

  async getById(id: string): Promise<Collection | null> {
    const rows = await this.db.select<CollectionRow[]>(
      `SELECT id, project_id, name, description, sort_order, created_at, updated_at, deleted_at
       FROM collections WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ? fromRow(rows[0]) : null;
  }

  async save(collection: Collection): Promise<Collection> {
    await this.db.execute(
      `INSERT INTO collections
         (id, project_id, name, description, sort_order, created_at, updated_at, deleted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT(id) DO UPDATE SET
         project_id = excluded.project_id,
         name = excluded.name,
         description = excluded.description,
         sort_order = excluded.sort_order,
         updated_at = excluded.updated_at,
         deleted_at = excluded.deleted_at`,
      [
        collection.id,
        collection.projectId,
        collection.name,
        collection.description,
        collection.sortOrder,
        collection.createdAt,
        collection.updatedAt,
        collection.deletedAt,
      ],
    );
    return collection;
  }

  async softDelete(id: string, deletedAt: string): Promise<void> {
    await this.db.execute(
      "UPDATE collections SET deleted_at = $1, updated_at = $1 WHERE id = $2",
      [deletedAt, id],
    );
  }
}

function fromRow(row: CollectionRow): Collection {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    description: row.description,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}
