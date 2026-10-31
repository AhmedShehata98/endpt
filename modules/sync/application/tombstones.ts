/** Soft-deleted entities ready to hard-purge after both sides have synced them. */
export function collectPurgeableIds<T extends { id: string; deletedAt: string | null }>(
  entities: T[],
): string[] {
  return entities.filter((e) => e.deletedAt != null).map((e) => e.id);
}

export function partitionLiveAndTombstones<
  T extends { id: string; deletedAt: string | null },
>(entities: T[]): { live: T[]; tombstones: T[] } {
  const live: T[] = [];
  const tombstones: T[] = [];
  for (const entity of entities) {
    if (entity.deletedAt != null) tombstones.push(entity);
    else live.push(entity);
  }
  return { live, tombstones };
}
