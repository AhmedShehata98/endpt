import type { Project } from "@modules/project";
import type { ProjectRepository } from "@modules/project/ports/project.repository";
import type { SqlDatabase } from "./database";

interface ProjectRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class SqliteProjectRepository implements ProjectRepository {
  constructor(private readonly db: SqlDatabase) {}

  async listByUserId(userId: string): Promise<Project[]> {
    const rows = await this.db.select<ProjectRow[]>(
      `SELECT id, user_id, name, description, sort_order, created_at, updated_at, deleted_at
       FROM projects
       WHERE user_id = $1 AND deleted_at IS NULL
       ORDER BY sort_order ASC, created_at ASC`,
      [userId],
    );
    return rows.map(fromRow);
  }

  async getById(id: string): Promise<Project | null> {
    const rows = await this.db.select<ProjectRow[]>(
      `SELECT id, user_id, name, description, sort_order, created_at, updated_at, deleted_at
       FROM projects WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ? fromRow(rows[0]) : null;
  }

  async save(project: Project): Promise<Project> {
    await this.db.execute(
      `INSERT INTO projects
         (id, user_id, name, description, sort_order, created_at, updated_at, deleted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT(id) DO UPDATE SET
         user_id = excluded.user_id,
         name = excluded.name,
         description = excluded.description,
         sort_order = excluded.sort_order,
         updated_at = excluded.updated_at,
         deleted_at = excluded.deleted_at`,
      [
        project.id,
        project.userId,
        project.name,
        project.description,
        project.sortOrder,
        project.createdAt,
        project.updatedAt,
        project.deletedAt,
      ],
    );
    return project;
  }

  async softDelete(id: string, deletedAt: string): Promise<void> {
    await this.db.execute(
      "UPDATE projects SET deleted_at = $1, updated_at = $1 WHERE id = $2",
      [deletedAt, id],
    );
  }
}

function fromRow(row: ProjectRow): Project {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}
