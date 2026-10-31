import { describe, expect, it } from "vitest";
import { createMemoryRepositories, MemoryPasswordHasher } from "@modules/persistence";
import { AccountService } from "./account.service";

function createService() {
  const repos = createMemoryRepositories();
  const hasher = new MemoryPasswordHasher();
  let n = 0;
  const service = new AccountService(
    repos.userAccounts,
    repos.sessions,
    repos.userSettings,
    hasher,
    () => `id-${++n}`,
    () => "2026-01-01T00:00:00.000Z",
  );
  return { service, repos, hasher };
}

describe("AccountService", () => {
  it("signs up, creates settings and session, strips passwordHash", async () => {
    const { service, repos } = createService();
    const result = await service.signUp({
      email: " Dev@Example.com ",
      password: "password1",
      displayName: "  Dev  ",
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    expect(result.account.email).toBe("dev@example.com");
    expect(result.account.displayName).toBe("Dev");
    expect(result.account).not.toHaveProperty("passwordHash");
    expect(result.settings.theme).toBe("system");
    expect(result.settings.userId).toBe(result.account.id);

    const stored = await repos.userAccounts.getById(result.account.id);
    expect(stored?.passwordHash.startsWith("memory$")).toBe(true);

    const session = await repos.sessions.getActive();
    expect(session?.userId).toBe(result.account.id);
    expect(session?.expiresAt).toBeNull();
  });

  it("rejects duplicate email on sign-up", async () => {
    const { service } = createService();
    await service.signUp({ email: "a@example.com", password: "password1" });
    const result = await service.signUp({
      email: "A@example.com",
      password: "password1",
    });
    expect(result).toEqual({ status: "email-taken" });
  });

  it("rejects short passwords", async () => {
    const { service } = createService();
    const result = await service.signUp({
      email: "a@example.com",
      password: "short",
    });
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") return;
    expect(result.issues.some((i) => i.field === "password")).toBe(true);
  });

  it("signs in with valid credentials", async () => {
    const { service } = createService();
    await service.signUp({ email: "a@example.com", password: "password1" });
    await service.signOut();

    const result = await service.signIn({
      email: "a@example.com",
      password: "password1",
    });
    expect(result.status).toBe("ok");
  });

  it("returns invalid-credentials for bad password without leaking email", async () => {
    const { service } = createService();
    await service.signUp({ email: "a@example.com", password: "password1" });
    await service.signOut();

    expect(
      await service.signIn({ email: "a@example.com", password: "wrongpass" }),
    ).toEqual({ status: "invalid-credentials" });
    expect(
      await service.signIn({ email: "missing@example.com", password: "password1" }),
    ).toEqual({ status: "invalid-credentials" });
  });

  it("rejects accounts with empty password hash", async () => {
    const { service, repos } = createService();
    await repos.userAccounts.save({
      id: "u1",
      email: "empty@example.com",
      displayName: null,
      passwordHash: "",
      cloudUserId: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      lastSyncedAt: null,
      deletedAt: null,
    });

    expect(
      await service.signIn({ email: "empty@example.com", password: "password1" }),
    ).toEqual({ status: "invalid-credentials" });
  });

  it("restores an active session and signs out", async () => {
    const { service } = createService();
    const signedUp = await service.signUp({
      email: "a@example.com",
      password: "password1",
      displayName: "A",
    });
    expect(signedUp.status).toBe("ok");

    const restored = await service.restoreSession();
    expect(restored.status).toBe("signed-in");
    if (restored.status !== "signed-in") return;
    expect(restored.account.email).toBe("a@example.com");
    expect(restored.account).not.toHaveProperty("passwordHash");

    await service.signOut();
    expect(await service.restoreSession()).toEqual({ status: "signed-out" });
  });

  it("stores empty display name as null", async () => {
    const { service } = createService();
    const result = await service.signUp({
      email: "a@example.com",
      password: "password1",
      displayName: "   ",
    });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.account.displayName).toBeNull();
  });
});
