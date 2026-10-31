import { describe, expect, it } from "vitest";
import { createEmptyDraft } from "@modules/request";
import { DuplicateEnvKeyError } from "@modules/environment";
import { createMemoryRepositories } from "../../create-repositories";
import { MemorySecretCipher } from "../secrets/memory-secret-cipher";
import { encryptDraft, decryptDraft } from "../secrets/draft-secrets";

describe("memory repositories", () => {
  it("round-trips guest ad-hoc draft", async () => {
    const repos = createMemoryRepositories();
    const draft = {
      ...createEmptyDraft("POST"),
      name: "Create thing",
      url: "{{baseUrl}}/items",
      bodyType: "json" as const,
      body: '{"ok":true}',
      auth: {
        ...createEmptyDraft().auth,
        enabled: true,
        type: "bearerToken" as const,
        token: "secret-token",
      },
    };

    await repos.adHocRequests.save({
      id: "ad-hoc-guest",
      userId: null,
      draft,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const loaded = await repos.adHocRequests.getByUserId(null);
    expect(loaded?.draft.url).toBe("{{baseUrl}}/items");
    expect(loaded?.draft.auth.token).toBe("secret-token");
    expect(loaded?.userId).toBeNull();
  });

  it("rejects duplicate env keys for guest scope", async () => {
    const repos = createMemoryRepositories();
    await repos.environmentVariables.save({
      id: "e1",
      userId: null,
      key: "baseUrl",
      value: "https://a.example",
      role: "baseUrl",
      updatedAt: "2026-01-01T00:00:00.000Z",
      deletedAt: null,
    });

    await expect(
      repos.environmentVariables.save({
        id: "e2",
        userId: null,
        key: "baseUrl",
        value: "https://b.example",
        role: "baseUrl",
        updatedAt: "2026-01-01T00:00:01.000Z",
        deletedAt: null,
      }),
    ).rejects.toBeInstanceOf(DuplicateEnvKeyError);
  });

  it("allows reusing env key after soft delete", async () => {
    const repos = createMemoryRepositories();
    await repos.environmentVariables.save({
      id: "e1",
      userId: null,
      key: "apiKey",
      value: "old",
      role: "apiKey",
      updatedAt: "2026-01-01T00:00:00.000Z",
      deletedAt: null,
    });
    await repos.environmentVariables.softDelete("e1", "2026-01-01T00:00:02.000Z");

    await expect(
      repos.environmentVariables.save({
        id: "e2",
        userId: null,
        key: "apiKey",
        value: "new",
        role: "apiKey",
        updatedAt: "2026-01-01T00:00:03.000Z",
        deletedAt: null,
      }),
    ).resolves.toMatchObject({ key: "apiKey", value: "new" });

    const listed = await repos.environmentVariables.listByUserId(null);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe("e2");
  });

  it("soft-deletes projects and hides them from list", async () => {
    const repos = createMemoryRepositories();
    await repos.projects.save({
      id: "p1",
      userId: "u1",
      name: "Auth",
      description: null,
      sortOrder: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      deletedAt: null,
    });
    await repos.projects.softDelete("p1", "2026-01-02T00:00:00.000Z");
    expect(await repos.projects.listByUserId("u1")).toEqual([]);
  });

  it("encrypts draft auth secrets through cipher helpers", async () => {
    const cipher = new MemorySecretCipher();
    const draft = createEmptyDraft();
    draft.auth = {
      ...draft.auth,
      enabled: true,
      token: "tok",
      apiKey: "key",
      password: "pw",
    };

    const encrypted = await encryptDraft(draft, cipher);
    expect(encrypted.auth.token).not.toBe("tok");
    expect(encrypted.auth.apiKey).not.toBe("key");
    expect(encrypted.auth.password).not.toBe("pw");

    const decrypted = await decryptDraft(encrypted, cipher);
    expect(decrypted.auth.token).toBe("tok");
    expect(decrypted.auth.apiKey).toBe("key");
    expect(decrypted.auth.password).toBe("pw");
  });

  it("persists account, session, and settings", async () => {
    const repos = createMemoryRepositories();
    await repos.userAccounts.save({
      id: "u1",
      email: "a@example.com",
      displayName: "A",
      cloudUserId: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      lastSyncedAt: null,
      deletedAt: null,
    });
    await repos.sessions.save({
      id: "s1",
      userId: "u1",
      accessToken: "cloud-token",
      createdAt: "2026-01-01T00:00:00.000Z",
      expiresAt: null,
    });
    await repos.userSettings.save({
      id: "set1",
      userId: "u1",
      theme: "dark",
      defaultHttpMethod: "POST",
      wrapResponseLines: true,
      syncEnabled: false,
      updatedAt: "2026-01-01T00:00:00.000Z",
      deletedAt: null,
    });

    expect((await repos.userAccounts.getByEmail("a@example.com"))?.id).toBe("u1");
    expect((await repos.sessions.getActive())?.accessToken).toBe("cloud-token");
    expect((await repos.userSettings.getByUserId("u1"))?.theme).toBe("dark");
  });
});
