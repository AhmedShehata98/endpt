import type { RequestDraft, SavedRequest } from "@modules/request";
import type { SavedRequestRepository } from "@modules/request/ports/saved-request.repository";
import type { CollectionRepository } from "../../ports/collection.repository";
import type { ProjectRepository } from "../../ports/project.repository";
import type { Collection, Project } from "../../types/project.types";

export type CollectionNode = {
  collection: Collection;
  requests: SavedRequest[];
};

export type ProjectNode = {
  project: Project;
  collections: CollectionNode[];
};

export type CascadeTarget =
  | { kind: "project"; id: string }
  | { kind: "collection"; id: string }
  | { kind: "request"; id: string };

export type CascadeCounts = {
  collections: number;
  requests: number;
};

export type ProjectMutationResult =
  | { status: "ok"; project: Project }
  | { status: "invalid"; message: string }
  | { status: "not-found" };

export type CollectionMutationResult =
  | { status: "ok"; collection: Collection }
  | { status: "invalid"; message: string }
  | { status: "not-found" };

export type SavedRequestMutationResult =
  | { status: "ok"; request: SavedRequest }
  | { status: "invalid"; message: string }
  | { status: "not-found" };

export class ProjectService {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly collections: CollectionRepository,
    private readonly savedRequests: SavedRequestRepository,
    private readonly createId: () => string = () => crypto.randomUUID(),
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async listTree(userId: string): Promise<ProjectNode[]> {
    const projects = await this.projects.listByUserId(userId);
    const nodes: ProjectNode[] = [];

    for (const project of projects) {
      const collections = await this.collections.listByProjectId(project.id);
      const collectionNodes: CollectionNode[] = [];
      for (const collection of collections) {
        const requests = await this.savedRequests.listByCollectionId(collection.id);
        collectionNodes.push({ collection, requests });
      }
      nodes.push({ project, collections: collectionNodes });
    }

    return nodes;
  }

  async createProject(input: {
    userId: string;
    name: string;
    description?: string | null;
  }): Promise<ProjectMutationResult> {
    const name = normalizeName(input.name);
    if (!name) return { status: "invalid", message: "Project name is required." };

    const now = this.now();
    const existing = await this.projects.listByUserId(input.userId);
    const project: Project = {
      id: this.createId(),
      userId: input.userId,
      name,
      description: normalizeDescription(input.description),
      sortOrder: nextSortOrder(existing),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    await this.projects.save(project);
    return { status: "ok", project };
  }

  async renameProject(input: {
    id: string;
    name: string;
    description?: string | null;
  }): Promise<ProjectMutationResult> {
    const existing = await this.projects.getById(input.id);
    if (!existing || existing.deletedAt != null) return { status: "not-found" };

    const name = normalizeName(input.name);
    if (!name) return { status: "invalid", message: "Project name is required." };

    const now = this.now();
    const project: Project = {
      ...existing,
      name,
      description:
        input.description === undefined
          ? existing.description
          : normalizeDescription(input.description),
      updatedAt: now,
    };
    await this.projects.save(project);
    return { status: "ok", project };
  }

  async createCollection(input: {
    projectId: string;
    name: string;
    description?: string | null;
  }): Promise<CollectionMutationResult> {
    const project = await this.projects.getById(input.projectId);
    if (!project || project.deletedAt != null) return { status: "not-found" };

    const name = normalizeName(input.name);
    if (!name) return { status: "invalid", message: "Collection name is required." };

    const now = this.now();
    const existing = await this.collections.listByProjectId(input.projectId);
    const collection: Collection = {
      id: this.createId(),
      projectId: input.projectId,
      name,
      description: normalizeDescription(input.description),
      sortOrder: nextSortOrder(existing),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    await this.collections.save(collection);
    return { status: "ok", collection };
  }

  async renameCollection(input: {
    id: string;
    name: string;
    description?: string | null;
  }): Promise<CollectionMutationResult> {
    const existing = await this.collections.getById(input.id);
    if (!existing || existing.deletedAt != null) return { status: "not-found" };

    const name = normalizeName(input.name);
    if (!name) return { status: "invalid", message: "Collection name is required." };

    const now = this.now();
    const collection: Collection = {
      ...existing,
      name,
      description:
        input.description === undefined
          ? existing.description
          : normalizeDescription(input.description),
      updatedAt: now,
    };
    await this.collections.save(collection);
    return { status: "ok", collection };
  }

  async saveRequest(input: {
    collectionId: string;
    draft: RequestDraft;
    name: string;
  }): Promise<SavedRequestMutationResult> {
    const collection = await this.collections.getById(input.collectionId);
    if (!collection || collection.deletedAt != null) return { status: "not-found" };

    const name = normalizeName(input.name);
    if (!name) return { status: "invalid", message: "Request name is required." };

    const now = this.now();
    const existing = await this.savedRequests.listByCollectionId(input.collectionId);
    const request: SavedRequest = {
      id: this.createId(),
      collectionId: input.collectionId,
      draft: { ...structuredClone(input.draft), name },
      sortOrder: nextSortOrder(existing),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    await this.savedRequests.save(request);
    return { status: "ok", request };
  }

  async updateSavedRequest(
    id: string,
    draft: RequestDraft,
  ): Promise<SavedRequestMutationResult> {
    const existing = await this.savedRequests.getById(id);
    if (!existing || existing.deletedAt != null) return { status: "not-found" };

    const now = this.now();
    const request: SavedRequest = {
      ...existing,
      draft: structuredClone(draft),
      updatedAt: now,
    };
    await this.savedRequests.save(request);
    return { status: "ok", request };
  }

  async renameSavedRequest(input: {
    id: string;
    name: string;
  }): Promise<SavedRequestMutationResult> {
    const existing = await this.savedRequests.getById(input.id);
    if (!existing || existing.deletedAt != null) return { status: "not-found" };

    const name = normalizeName(input.name);
    if (!name) return { status: "invalid", message: "Request name is required." };

    const now = this.now();
    const request: SavedRequest = {
      ...existing,
      draft: { ...existing.draft, name },
      updatedAt: now,
    };
    await this.savedRequests.save(request);
    return { status: "ok", request };
  }

  async getSavedRequest(id: string): Promise<SavedRequest | null> {
    const request = await this.savedRequests.getById(id);
    if (!request || request.deletedAt != null) return null;
    return request;
  }

  async findBreadcrumb(savedRequestId: string): Promise<{
    projectName: string;
    collectionName: string;
  } | null> {
    const request = await this.getSavedRequest(savedRequestId);
    if (!request) return null;
    const collection = await this.collections.getById(request.collectionId);
    if (!collection || collection.deletedAt != null) return null;
    const project = await this.projects.getById(collection.projectId);
    if (!project || project.deletedAt != null) return null;
    return { projectName: project.name, collectionName: collection.name };
  }

  async countCascade(target: CascadeTarget): Promise<CascadeCounts | null> {
    if (target.kind === "project") {
      const project = await this.projects.getById(target.id);
      if (!project || project.deletedAt != null) return null;
      const collections = await this.collections.listByProjectId(target.id);
      let requests = 0;
      for (const collection of collections) {
        const listed = await this.savedRequests.listByCollectionId(collection.id);
        requests += listed.length;
      }
      return { collections: collections.length, requests };
    }

    if (target.kind === "collection") {
      const collection = await this.collections.getById(target.id);
      if (!collection || collection.deletedAt != null) return null;
      const requests = await this.savedRequests.listByCollectionId(target.id);
      return { collections: 0, requests: requests.length };
    }

    const request = await this.savedRequests.getById(target.id);
    if (!request || request.deletedAt != null) return null;
    return { collections: 0, requests: 0 };
  }

  async deleteProject(id: string): Promise<{ status: "ok" } | { status: "not-found" }> {
    const project = await this.projects.getById(id);
    if (!project || project.deletedAt != null) return { status: "not-found" };

    const deletedAt = this.now();
    const collections = await this.collections.listByProjectId(id);
    for (const collection of collections) {
      await this.softDeleteCollectionTree(collection.id, deletedAt);
    }
    await this.projects.softDelete(id, deletedAt);
    return { status: "ok" };
  }

  async deleteCollection(
    id: string,
  ): Promise<{ status: "ok" } | { status: "not-found" }> {
    const collection = await this.collections.getById(id);
    if (!collection || collection.deletedAt != null) return { status: "not-found" };

    const deletedAt = this.now();
    await this.softDeleteCollectionTree(id, deletedAt);
    return { status: "ok" };
  }

  async deleteSavedRequest(
    id: string,
  ): Promise<{ status: "ok" } | { status: "not-found" }> {
    const request = await this.savedRequests.getById(id);
    if (!request || request.deletedAt != null) return { status: "not-found" };
    await this.savedRequests.softDelete(id, this.now());
    return { status: "ok" };
  }

  private async softDeleteCollectionTree(
    collectionId: string,
    deletedAt: string,
  ): Promise<void> {
    const requests = await this.savedRequests.listByCollectionId(collectionId);
    for (const request of requests) {
      await this.savedRequests.softDelete(request.id, deletedAt);
    }
    await this.collections.softDelete(collectionId, deletedAt);
  }
}

function normalizeName(value: string): string {
  return value.trim();
}

function normalizeDescription(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function nextSortOrder(items: { sortOrder: number }[]): number {
  if (items.length === 0) return 0;
  return Math.max(...items.map((item) => item.sortOrder)) + 1;
}
