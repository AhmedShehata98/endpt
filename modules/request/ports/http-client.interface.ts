import type { HttpMethod } from "../types/http.types";

export const DEFAULT_HTTP_TIMEOUT_MS = 30_000;

export interface PreparedRequest {
  method: HttpMethod;
  url: string;
  headers: { key: string; value: string }[];
  body: string | null;
}

export type TransportErrorCode = "network" | "timeout" | "dns" | "tls" | "blocked" | "unknown";

export type TransportResult =
  | {
      kind: "response";
      status: number;
      statusText: string;
      headers: { key: string; value: string }[];
      body: string;
      contentType: string | null;
      durationMs: number;
    }
  | {
      kind: "transport-error";
      code: TransportErrorCode;
      message: string;
      durationMs: number | null;
    };

export interface HttpClient {
  send(request: PreparedRequest, options?: { timeoutMs?: number }): Promise<TransportResult>;
}
