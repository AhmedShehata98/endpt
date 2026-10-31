import type { Project } from "../types/project.types";

export interface ProjectRepository {
  listByUserId(userId: string): Promise<Project[]>;
  getById(id: string): Promise<Project | null>;
  save(project: Project): Promise<Project>;
  softDelete(id: string, deletedAt: string): Promise<void>;
}
