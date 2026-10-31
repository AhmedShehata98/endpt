import { describe, expect, it } from "vitest";
import { createMemoryRepositories } from "@modules/persistence";
import { createEmptyDraft } from "@modules/request";
import { ProjectService } from "./project.service";

function createService() {
  const repos = createMemoryRepositories();
  let n = 0;
  const service = new ProjectService(
    repos.projects,
    repos.collections,
    repos.savedRequests,
    () => `id-${++n}`,
    () => "2026-01-01T00:00:00.000Z",
  );
  return { service, repos };
}

describe("ProjectService", () => {
  it("creates projects with appended sortOrder and lists the tree", async () => {
    const { service } = createService();
    const first = await service.createProject({ userId: "u1", name: " Alpha " });
    const second = await service.createProject({ userId: "u1", name: "Beta" });

    expect(first.status).toBe("ok");
    expect(second.status).toBe("ok");
    if (first.status !== "ok" || second.status !== "ok") return;

    expect(first.project.name).toBe("Alpha");
    expect(first.project.sortOrder).toBe(0);
    expect(second.project.sortOrder).toBe(1);

    const tree = await service.listTree("u1");
    expect(tree.map((n) => n.project.name)).toEqual(["Alpha", "Beta"]);
  });

  it("rejects empty project names", async () => {
    const { service } = createService();
    const result = await service.createProject({ userId: "u1", name: "   " });
    expect(result).toEqual({
      status: "invalid",
      message: "Project name is required.",
    });
  });

  it("creates collections under a project", async () => {
    const { service } = createService();
    const project = await service.createProject({ userId: "u1", name: "API" });
    if (project.status !== "ok") return;

    const collection = await service.createCollection({
      projectId: project.project.id,
      name: "Auth",
    });
    expect(collection.status).toBe("ok");
    if (collection.status !== "ok") return;

    const tree = await service.listTree("u1");
    expect(tree[0]?.collections[0]?.collection.name).toBe("Auth");
  });

  it("saves a request as a draft copy under a collection", async () => {
    const { service, repos } = createService();
    const project = await service.createProject({ userId: "u1", name: "API" });
    if (project.status !== "ok") return;
    const collection = await service.createCollection({
      projectId: project.project.id,
      name: "Auth",
    });
    if (collection.status !== "ok") return;

    const draft = { ...createEmptyDraft("POST"), url: "https://api.test/login", body: "{}" };
    const saved = await service.saveRequest({
      collectionId: collection.collection.id,
      draft,
      name: "Login",
    });
    expect(saved.status).toBe("ok");
    if (saved.status !== "ok") return;

    expect(saved.request.draft.name).toBe("Login");
    expect(saved.request.draft.url).toBe("https://api.test/login");
    expect(saved.request.sortOrder).toBe(0);

    draft.url = "mutated";
    const reloaded = await repos.savedRequests.getById(saved.request.id);
    expect(reloaded?.draft.url).toBe("https://api.test/login");
  });

  it("updates a saved request in place", async () => {
    const { service } = createService();
    const project = await service.createProject({ userId: "u1", name: "API" });
    if (project.status !== "ok") return;
    const collection = await service.createCollection({
      projectId: project.project.id,
      name: "Auth",
    });
    if (collection.status !== "ok") return;
    const saved = await service.saveRequest({
      collectionId: collection.collection.id,
      draft: createEmptyDraft("GET"),
      name: "Health",
    });
    if (saved.status !== "ok") return;

    const updated = await service.updateSavedRequest(saved.request.id, {
      ...createEmptyDraft("GET"),
      name: "Health",
      url: "https://api.test/health",
    });
    expect(updated.status).toBe("ok");
    if (updated.status !== "ok") return;
    expect(updated.request.draft.url).toBe("https://api.test/health");
  });

  it("counts cascade and soft-deletes project children", async () => {
    const { service, repos } = createService();
    const project = await service.createProject({ userId: "u1", name: "API" });
    if (project.status !== "ok") return;
    const colA = await service.createCollection({
      projectId: project.project.id,
      name: "A",
    });
    const colB = await service.createCollection({
      projectId: project.project.id,
      name: "B",
    });
    if (colA.status !== "ok" || colB.status !== "ok") return;

    await service.saveRequest({
      collectionId: colA.collection.id,
      draft: createEmptyDraft(),
      name: "R1",
    });
    await service.saveRequest({
      collectionId: colA.collection.id,
      draft: createEmptyDraft(),
      name: "R2",
    });
    await service.saveRequest({
      collectionId: colB.collection.id,
      draft: createEmptyDraft(),
      name: "R3",
    });

    const counts = await service.countCascade({
      kind: "project",
      id: project.project.id,
    });
    expect(counts).toEqual({ collections: 2, requests: 3 });

    const deleted = await service.deleteProject(project.project.id);
    expect(deleted).toEqual({ status: "ok" });

    const tree = await service.listTree("u1");
    expect(tree).toEqual([]);

    const storedProject = await repos.projects.getById(project.project.id);
    expect(storedProject?.deletedAt).toBe("2026-01-01T00:00:00.000Z");

    const storedCol = await repos.collections.getById(colA.collection.id);
    expect(storedCol?.deletedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("cascade-deletes a collection and its requests", async () => {
    const { service } = createService();
    const project = await service.createProject({ userId: "u1", name: "API" });
    if (project.status !== "ok") return;
    const collection = await service.createCollection({
      projectId: project.project.id,
      name: "Auth",
    });
    if (collection.status !== "ok") return;
    const saved = await service.saveRequest({
      collectionId: collection.collection.id,
      draft: createEmptyDraft(),
      name: "Login",
    });
    if (saved.status !== "ok") return;

    const counts = await service.countCascade({
      kind: "collection",
      id: collection.collection.id,
    });
    expect(counts).toEqual({ collections: 0, requests: 1 });

    await service.deleteCollection(collection.collection.id);
    expect(await service.getSavedRequest(saved.request.id)).toBeNull();

    const tree = await service.listTree("u1");
    expect(tree[0]?.collections).toEqual([]);
  });

  it("renames entities and finds breadcrumb for a saved request", async () => {
    const { service } = createService();
    const project = await service.createProject({ userId: "u1", name: "API" });
    if (project.status !== "ok") return;
    const collection = await service.createCollection({
      projectId: project.project.id,
      name: "Auth",
    });
    if (collection.status !== "ok") return;
    const saved = await service.saveRequest({
      collectionId: collection.collection.id,
      draft: createEmptyDraft(),
      name: "Login",
    });
    if (saved.status !== "ok") return;

    await service.renameProject({ id: project.project.id, name: "Public API" });
    await service.renameCollection({ id: collection.collection.id, name: "Users" });
    await service.renameSavedRequest({ id: saved.request.id, name: "Sign in" });

    const crumb = await service.findBreadcrumb(saved.request.id);
    expect(crumb).toEqual({
      projectName: "Public API",
      collectionName: "Users",
    });

    const loaded = await service.getSavedRequest(saved.request.id);
    expect(loaded?.draft.name).toBe("Sign in");
  });
});
