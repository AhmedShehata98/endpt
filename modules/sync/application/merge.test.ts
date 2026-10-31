import { describe, expect, it } from "vitest";
import { mergeByUpdatedAt, pickWinnerByUpdatedAt } from "./merge";

describe("mergeByUpdatedAt", () => {
  it("takes remote when local is missing", () => {
    const remote = { id: "1", updatedAt: "2026-01-02T00:00:00.000Z", name: "r" };
    expect(mergeByUpdatedAt(null, remote)).toEqual(remote);
  });

  it("keeps the newer updatedAt", () => {
    const local = { id: "1", updatedAt: "2026-01-02T00:00:00.000Z", name: "local" };
    const remote = { id: "1", updatedAt: "2026-01-01T00:00:00.000Z", name: "remote" };
    expect(mergeByUpdatedAt(local, remote).name).toBe("local");
  });

  it("prefers remote on equal timestamps", () => {
    const ts = "2026-01-01T00:00:00.000Z";
    const local = { id: "1", updatedAt: ts, name: "local" };
    const remote = { id: "1", updatedAt: ts, name: "remote" };
    expect(mergeByUpdatedAt(local, remote).name).toBe("remote");
  });
});

describe("pickWinnerByUpdatedAt", () => {
  it("merges by id with LWW", () => {
    const local = [
      { id: "a", updatedAt: "2026-01-02T00:00:00.000Z", v: 1 },
      { id: "b", updatedAt: "2026-01-01T00:00:00.000Z", v: 1 },
    ];
    const remote = [
      { id: "b", updatedAt: "2026-01-03T00:00:00.000Z", v: 2 },
      { id: "c", updatedAt: "2026-01-01T00:00:00.000Z", v: 2 },
    ];
    const winners = pickWinnerByUpdatedAt(local, remote);
    const byId = Object.fromEntries(winners.map((w) => [w.id, w]));
    expect(byId.a.v).toBe(1);
    expect(byId.b.v).toBe(2);
    expect(byId.c.v).toBe(2);
  });
});
