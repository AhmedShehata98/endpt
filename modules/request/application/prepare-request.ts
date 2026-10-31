import type { AuthConfig, RequestDraft } from "../types/http.types";
import type { PreparedRequest } from "../ports/http-client.interface";

const JSON_CONTENT_TYPE = "application/json";

export function requestSendsBody(draft: RequestDraft): boolean {
  return draft.method !== "GET" && draft.bodyType !== "none";
}

export function prepareRequest(draft: RequestDraft): PreparedRequest {
  return {
    method: draft.method,
    url: buildUrl(draft),
    headers: buildHeaders(draft),
    body: requestSendsBody(draft) ? (draft.body ?? "") : null,
  };
}

function buildUrl(draft: RequestDraft): string {
  if (draft.queryParams.length === 0) return draft.url;

  const url = new URL(draft.url);
  url.search = "";
  for (const param of draft.queryParams) {
    if (!param.enabled) continue;
    url.searchParams.append(param.key, param.value);
  }
  return url.toString();
}

function buildHeaders(draft: RequestDraft): PreparedRequest["headers"] {
  const headers = draft.headers
    .filter((header) => header.enabled)
    .map((header) => ({ key: header.key, value: header.value }));

  const authHeader = authHeaderFor(draft.auth);
  const withAuth = authHeader ? replaceHeader(headers, authHeader) : headers;
  if (
    !requestSendsBody(draft) ||
    draft.bodyType !== "json" ||
    hasHeader(withAuth, "content-type")
  ) {
    return withAuth;
  }
  return [...withAuth, { key: "Content-Type", value: JSON_CONTENT_TYPE }];
}

function authHeaderFor(auth: AuthConfig): PreparedRequest["headers"][number] | null {
  if (!auth.enabled) return null;
  if (auth.type === "bearerToken") {
    return { key: "Authorization", value: `Bearer ${auth.token ?? ""}` };
  }
  if (auth.type === "apiKey") {
    return { key: auth.apiKeyHeader ?? "X-API-Key", value: auth.apiKey ?? "" };
  }
  return {
    key: "Authorization",
    value: `Basic ${encodeBasicCredentials(auth.username ?? "", auth.password ?? "")}`,
  };
}

function replaceHeader(
  headers: PreparedRequest["headers"],
  replacement: PreparedRequest["headers"][number],
): PreparedRequest["headers"] {
  const kept = headers.filter(
    (header) => header.key.toLowerCase() !== replacement.key.toLowerCase(),
  );
  return [...kept, replacement];
}

function hasHeader(headers: PreparedRequest["headers"], name: string): boolean {
  return headers.some((header) => header.key.toLowerCase() === name);
}

function encodeBasicCredentials(username: string, password: string): string {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary);
}
