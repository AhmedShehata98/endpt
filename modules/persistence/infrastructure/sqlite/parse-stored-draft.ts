import type { AuthConfig, RequestDraft } from "@modules/request";

export class InvalidStoredDraftError extends Error {
  constructor(reason: string) {
    super(`Invalid stored draft: ${reason}`);
    this.name = "InvalidStoredDraftError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAuthConfig(value: unknown): value is AuthConfig {
  if (!isRecord(value)) return false;
  return (
    typeof value.enabled === "boolean" &&
    typeof value.type === "string" &&
    (value.token === null || typeof value.token === "string") &&
    (value.apiKey === null || typeof value.apiKey === "string") &&
    (value.apiKeyHeader === null || typeof value.apiKeyHeader === "string") &&
    (value.username === null || typeof value.username === "string") &&
    (value.password === null || typeof value.password === "string")
  );
}

function isRequestDraft(value: unknown): value is RequestDraft {
  if (!isRecord(value)) return false;
  return (
    (value.name === null || typeof value.name === "string") &&
    typeof value.method === "string" &&
    typeof value.url === "string" &&
    Array.isArray(value.queryParams) &&
    Array.isArray(value.headers) &&
    typeof value.bodyType === "string" &&
    (value.body === null || typeof value.body === "string") &&
    isAuthConfig(value.auth)
  );
}

export function parseStoredDraft(json: string): RequestDraft {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new InvalidStoredDraftError("not valid JSON");
  }
  if (!isRequestDraft(parsed)) {
    throw new InvalidStoredDraftError("unexpected shape");
  }
  return parsed;
}
