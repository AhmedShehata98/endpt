import { resolveDraft, type EnvBinding } from "@modules/environment";
import { detectBodyFormat, type ResponseView } from "@modules/response";
import { nowIso } from "@/lib/time";
import type { RequestDraft } from "../types/http.types";
import {
  DEFAULT_HTTP_TIMEOUT_MS,
  type HttpClient,
  type TransportResult,
} from "../ports/http-client.interface";
import { prepareRequest } from "./prepare-request";
import { validateDraft, type ValidationIssue } from "./validate-draft";

export type SendResult =
  | { status: "invalid"; issues: ValidationIssue[]; unresolved: string[] }
  | { status: "http-response"; response: ResponseView; unresolved: string[] }
  | {
      status: "network-error";
      message: string;
      durationMs: number | null;
      unresolved: string[];
    }
  | { status: "superseded" };

const TRANSPORT_FAILURE_MESSAGE = "Request failed before receiving an HTTP response";

export class RequestService {
  private latestSendId = 0;

  constructor(private readonly http: HttpClient) {}

  async send(draft: RequestDraft, variables: readonly EnvBinding[]): Promise<SendResult> {
    const sendId = ++this.latestSendId;
    const { draft: resolved, unresolved } = resolveDraft(draft, variables);
    const issues = validateDraft(resolved);
    if (issues.length > 0) {
      return { status: "invalid", issues, unresolved };
    }

    const transport = await this.sendTransport(resolved);
    if (sendId !== this.latestSendId) return { status: "superseded" };
    if (transport.kind === "transport-error") {
      return {
        status: "network-error",
        message: transport.message,
        durationMs: transport.durationMs,
        unresolved,
      };
    }
    return {
      status: "http-response",
      response: toResponseView(transport),
      unresolved,
    };
  }

  private async sendTransport(draft: RequestDraft): Promise<TransportResult> {
    const prepared = prepareRequest(draft);
    try {
      return await this.http.send(prepared, { timeoutMs: DEFAULT_HTTP_TIMEOUT_MS });
    } catch {
      return thrownTransportFailure();
    }
  }
}

function thrownTransportFailure(): TransportResult {
  return {
    kind: "transport-error",
    code: "unknown",
    message: TRANSPORT_FAILURE_MESSAGE,
    durationMs: null,
  };
}

function toResponseView(result: Extract<TransportResult, { kind: "response" }>): ResponseView {
  return {
    status: result.status,
    statusText: result.statusText,
    headers: result.headers,
    body: result.body,
    contentType: result.contentType,
    bodyFormat: detectBodyFormat(result.contentType),
    durationMs: result.durationMs,
    errorMessage: null,
    receivedAt: nowIso(),
  };
}
