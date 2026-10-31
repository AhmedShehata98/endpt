import { describe, expect, it } from "vitest";
import { collectPurgeableIds, partitionLiveAndTombstones } from "./tombstones";

describe("tombstones", () => {
  it("collects soft-deleted ids", () => {
    expect(
      collectPurgeableIds([
        { id: "a", deletedAt: null },
        { id: "b", deletedAt: "2026-01-01T00:00:00.000Z" },
      ]),
    ).toEqual(["b"]);
  });

  it("partitions live and tombstones", () => {
    const { live, tombstones } = partitionLiveAndTombstones([
      { id: "a", deletedAt: null },
      { id: "b", deletedAt: "2026-01-01T00:00:00.000Z" },
    ]);
    expect(live.map((e) => e.id)).toEqual(["a"]);
    expect(tombstones.map((e) => e.id)).toEqual(["b"]);
  });
});
