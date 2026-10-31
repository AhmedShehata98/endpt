import type { AuthConfig, RequestDraft } from "../types/http.types";
import { requestSendsBody } from "./prepare-request";

export interface ValidationIssue {
  field: "url" | "header" | "body" | "auth";
  message: string;
}

const INVALID_HEADER_NAME = /[\s:]/;

export function validateDraft(draft: RequestDraft): ValidationIssue[] {
  return [
    ...urlIssues(draft.url),
    ...headerIssues(draft),
    ...bodyIssues(draft),
    ...authIssues(draft.auth),
  ];
}

function urlIssues(url: string): ValidationIssue[] {
  if (isHttpUrl(url)) return [];
  return [{ field: "url", message: "Enter an http or https URL" }];
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function headerIssues(draft: RequestDraft): ValidationIssue[] {
  return draft.headers.flatMap((header) => {
    if (!header.enabled || isHeaderName(header.key)) return [];
    const message =
      header.key.length === 0
        ? "Header name is required"
        : `Header name "${header.key}" is invalid`;
    return [{ field: "header" as const, message }];
  });
}

function bodyIssues(draft: RequestDraft): ValidationIssue[] {
  if (!requestSendsBody(draft) || draft.bodyType !== "json") return [];
  try {
    JSON.parse(draft.body ?? "");
    return [];
  } catch {
    return [{ field: "body", message: "Body is not valid JSON" }];
  }
}

function authIssues(auth: AuthConfig): ValidationIssue[] {
  if (!auth.enabled) return [];
  if (auth.type === "bearerToken") return requiredText(auth.token, "Token is required");
  if (auth.type === "basic") return requiredText(auth.username, "Username is required");
  return [
    ...apiKeyHeaderIssues(auth.apiKeyHeader),
    ...requiredText(auth.apiKey, "API key is required"),
  ];
}

function apiKeyHeaderIssues(headerName: string | null): ValidationIssue[] {
  if (!hasText(headerName)) {
    return [{ field: "auth", message: "API key header name is required" }];
  }
  if (!isHeaderName(headerName)) {
    return [{ field: "auth", message: "API key header name is invalid" }];
  }
  return [];
}

function requiredText(value: string | null, message: string): ValidationIssue[] {
  if (hasText(value)) return [];
  return [{ field: "auth", message }];
}

function hasText(value: string | null): value is string {
  return value !== null && value.trim().length > 0;
}

function isHeaderName(name: string): boolean {
  return name.length > 0 && !INVALID_HEADER_NAME.test(name);
}
