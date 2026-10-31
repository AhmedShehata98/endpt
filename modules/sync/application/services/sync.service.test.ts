import { describe, expect, it } from "vitest";
import { MemoryPasswordHasher } from "@modules/persistence/infrastructure/secrets/memory-password-hasher";
import { createMemoryRepositories } from "@modules/persistence";
import { FakeSyncRemote } from "../../infrastructure/fake-sync-remote";
import { MemorySyncKeyStore } from "../../infrastructure/memory-sync-key-store";
import { SyncService } from "./sync.service";

async function setup() {
  const repos = createMemoryRepositories();
  const hasher = new MemoryPasswordHasher();
  const remote = new FakeSyncRemote();
  const keyStore = new MemorySyncKeyStore();
  const now = "2026-01-10T00:00:00.000Z";

  const passwordHash = await hasher.hash("password123");
  const account = {
    id: "user-1",
    email: "dev@example.com",
    displayName: "Dev",
    passwordHash,
    cloudUserId: null as string | null,
    createdAt: now,
    updatedAt: now,
    lastSyncedAt: null as string | null,
    deletedAt: null,
  };
  await repos.userAccounts.save(account);
  await repos.sessions.save({
    id: "sess-1",
    userId: account.id,
    accessToken: null,
    createdAt: now,
    expiresAt: null,
  });
  await repos.userSettings.save({
    id: "settings-1",
    userId: account.id,
    theme: "dark",
    defaultHttpMethod: "GET",
    wrapResponseLines: false,
    syncEnabled: true,
    updatedAt: now,
    deletedAt: null,
  });
  await repos.projects.save({
    id: "proj-1",
    userId: account.id,
    name: "API",
    description: null,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  const service = new SyncService(
    remote,
    keyStore,
    repos.userAccounts,
    repos.sessions,
    repos.userSettings,
    repos.projects,
    repos.collections,
    repos.savedRequests,
    repos.environmentVariables,
    hasher,
    () => "2026-01-11T00:00:00.000Z",
  );

  return { repos, remote, keyStore, service, account };
}

describe("SyncService", () => {
  it("skips when sync disabled", async () => {
    const { service, account } = await setup();
    const result = await service.run({
      account,
      syncEnabled: false,
      online: true,
    });
    expect(result).toEqual({ kind: "skipped", status: "local-only", message: null });
  });

  it("skips when offline", async () => {
    const { service, account } = await setup();
    const result = await service.run({
      account,
      syncEnabled: true,
      online: false,
    });
    expect(result.kind).toBe("skipped");
    if (result.kind === "skipped") expect(result.status).toBe("offline");
  });

  it("asks for password when unlinked", async () => {
    const { service, account } = await setup();
    const result = await service.run({
      account,
      syncEnabled: true,
      online: true,
    });
    expect(result).toEqual({ kind: "needs-password" });
  });

  it("links, pushes local data, and marks lastSyncedAt", async () => {
    const { service, account, repos, remote } = await setup();
    const result = await service.run({
      account,
      syncEnabled: true,
      online: true,
      password: "password123",
    });
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;

    const updated = await repos.userAccounts.getById(account.id);
    expect(updated?.cloudUserId).toBe("cloud:dev@example.com");
    expect(updated?.lastSyncedAt).toBe("2026-01-11T00:00:00.000Z");

    const pushed = remote.all();
    expect(pushed.some((e) => e.kind === "project" && e.id === "proj-1")).toBe(true);
    expect(pushed.some((e) => e.kind === "settings")).toBe(true);

    const session = await repos.sessions.getActive();
    expect(session?.accessToken).toBe("token:dev@example.com");
  });

  it("merges remote LWW winner into local store", async () => {
    const { service, account, repos, remote } = await setup();
    await service.run({
      account,
      syncEnabled: true,
      online: true,
      password: "password123",
    });

    remote.seed([
      {
        kind: "project",
        id: "proj-1",
        updatedAt: "2026-02-01T00:00:00.000Z",
        deletedAt: null,
        payload: {
          id: "proj-1",
          userId: account.id,
          name: "Remote Win",
          description: null,
          sortOrder: 0,
          createdAt: "2026-01-10T00:00:00.000Z",
          updatedAt: "2026-02-01T00:00:00.000Z",
          deletedAt: null,
        },
      },
    ]);

    const linked = await repos.userAccounts.getById(account.id);
    const result = await service.run({
      account: linked!,
      syncEnabled: true,
      online: true,
    });
    expect(result.kind).toBe("ok");

    const project = await repos.projects.getById("proj-1");
    expect(project?.name).toBe("Remote Win");
  });

  it("preserves local data when remote fails", async () => {
    const { service, account, repos, remote } = await setup();
    remote.failNext = true;
    const result = await service.run({
      account,
      syncEnabled: true,
      online: true,
      password: "password123",
    });
    expect(result.kind).toBe("failed");
    const project = await repos.projects.getById("proj-1");
    expect(project?.name).toBe("API");
  });

  it("purges soft-deleted tombstones after sync", async () => {
    const { service, account, repos } = await setup();
    await repos.projects.softDelete("proj-1", "2026-01-10T12:00:00.000Z");

    const result = await service.run({
      account,
      syncEnabled: true,
      online: true,
      password: "password123",
    });
    expect(result.kind).toBe("ok");

    const gone = await repos.projects.getById("proj-1");
    expect(gone).toBeNull();
  });
});
