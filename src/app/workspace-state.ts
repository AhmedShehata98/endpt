import type { ValidationIssue } from "@modules/request";
import type { ResponseView } from "@modules/response";

export type SendState =
  | { status: "idle" }
  | { status: "invalid"; issues: ValidationIssue[] }
  | { status: "sending"; startedAt: number }
  | { status: "http-response"; response: ResponseView }
  | { status: "network-error"; message: string; durationMs: number | null };

export type SaveState = "ad-hoc" | "saved" | "unsaved";
