import type { Project } from "@modules/project";
import type { ProjectRepository } from "@modules/project/ports/project.repository";

export class MemoryProjectRepository implements ProjectRepository {
  private readonly byId = new Map<string, Project>();

  async listByUserId(userId: string): Promise<Project[]> {
    return [...this.byId.values()]
      .filter((p) => p.userId === userId && p.deletedAt == null)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt))
      .map((p) => structuredClone(p));
  }

  async getById(id: string): Promise<Project | null> {
    const found = this.byId.get(id);
    return found ? structuredClone(found) : null;
  }

  async save(project: Project): Promise<Project> {
    this.byId.set(project.id, structuredClone(project));
    return structuredClone(project);
  }

  async softDelete(id: string, deletedAt: string): Promise<void> {
    const existing = this.byId.get(id);
    if (!existing) return;
    this.byId.set(id, { ...existing, deletedAt, updatedAt: deletedAt });
  }
}
