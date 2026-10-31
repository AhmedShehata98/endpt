import type { KeyValuePair } from "../types/http.types";

export function syncParamsFromUrl(
  url: string,
  params: readonly KeyValuePair[],
  createId: () => string = () => crypto.randomUUID(),
): KeyValuePair[] {
  const entries = parseQueryEntries(url);
  const disabled = params.filter((param) => !param.enabled);
  const previousEnabled = params.filter((param) => param.enabled);

  const enabled = entries.map(([key, value], index) => {
    const existing = previousEnabled[index];
    if (existing) return { ...existing, key, value };
    return { id: createId(), key, value, enabled: true };
  });

  return [...enabled, ...disabled];
}

export function syncUrlFromParams(url: string, params: readonly KeyValuePair[]): string {
  const { path, hash } = splitUrl(url);
  const search = new URLSearchParams();
  for (const param of params) {
    if (!param.enabled) continue;
    search.append(param.key, param.value);
  }
  const query = search.toString();
  const withQuery = query.length > 0 ? `${path}?${query}` : path;
  return `${withQuery}${hash}`;
}

function parseQueryEntries(url: string): [string, string][] {
  const query = splitUrl(url).query;
  if (query.length === 0) return [];
  return [...new URLSearchParams(query)];
}

function splitUrl(url: string): { path: string; query: string; hash: string } {
  const hashStart = url.indexOf("#");
  const withoutHash = hashStart < 0 ? url : url.slice(0, hashStart);
  const hash = hashStart < 0 ? "" : url.slice(hashStart);
  const queryStart = withoutHash.indexOf("?");
  if (queryStart < 0) return { path: withoutHash, query: "", hash };
  return {
    path: withoutHash.slice(0, queryStart),
    query: withoutHash.slice(queryStart + 1),
    hash,
  };
}
