/** Last-write-wins by `updatedAt`. Equal timestamps prefer remote (single-user). */
export function mergeByUpdatedAt<T extends { updatedAt: string }>(
  local: T | null,
  remote: T,
): T {
  if (!local) return remote;
  return remote.updatedAt >= local.updatedAt ? remote : local;
}

export function pickWinnerByUpdatedAt<T extends { id: string; updatedAt: string }>(
  localItems: T[],
  remoteItems: T[],
): T[] {
  const byId = new Map<string, T>();
  for (const item of localItems) {
    byId.set(item.id, item);
  }
  for (const remote of remoteItems) {
    const local = byId.get(remote.id) ?? null;
    byId.set(remote.id, mergeByUpdatedAt(local, remote));
  }
  return [...byId.values()];
}
