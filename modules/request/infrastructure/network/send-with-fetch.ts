import {
  DEFAULT_HTTP_TIMEOUT_MS,
  type PreparedRequest,
  type TransportErrorCode,
  type TransportResult,
} from "../../ports/http-client.interface";

type FetchLike = (
  input: string,
  init?: RequestInit & { connectTimeout?: number },
) => Promise<Response>;

export async function sendWithFetch(
  fetchFn: FetchLike,
  request: PreparedRequest,
  options?: { timeoutMs?: number },
): Promise<TransportResult> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_HTTP_TIMEOUT_MS;
  const startedAt = performance.now();
  try {
    const response = await fetchFn(request.url, requestInit(request, timeoutMs));
    const body = await response.text();
    return {
      kind: "response",
      status: response.status,
      statusText: response.statusText,
      headers: readHeaders(response.headers),
      body,
      contentType: response.headers.get("content-type"),
      durationMs: elapsedMs(startedAt),
    };
  } catch (error) {
    return transportFailure(error, elapsedMs(startedAt));
  }
}

function requestInit(
  request: PreparedRequest,
  timeoutMs: number,
): RequestInit & { connectTimeout: number } {
  const init: RequestInit & { connectTimeout: number } = {
    method: request.method,
    headers: toHeaders(request.headers),
    signal: AbortSignal.timeout(timeoutMs),
    connectTimeout: timeoutMs,
  };
  if (request.body !== null) init.body = request.body;
  return init;
}

function toHeaders(headers: PreparedRequest["headers"]): Headers {
  const result = new Headers();
  for (const header of headers) result.append(header.key, header.value);
  return result;
}

function readHeaders(headers: Headers): PreparedRequest["headers"] {
  const pairs: PreparedRequest["headers"] = [];
  headers.forEach((value, key) => {
    pairs.push({ key, value });
  });
  return pairs;
}

function transportFailure(error: unknown, durationMs: number): TransportResult {
  if (isTimeoutError(error)) {
    return { kind: "transport-error", code: "timeout", message: "Request timed out", durationMs };
  }
  const failure = describeNetworkError(error);
  return { kind: "transport-error", code: failure.code, message: failure.message, durationMs };
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

function describeNetworkError(error: unknown): { code: TransportErrorCode; message: string } {
  const code = readErrorCode(error);
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
    return { code: "dns", message: "Could not resolve host" };
  }
  if (
    code === "CERT_HAS_EXPIRED" ||
    code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
    code?.includes("TLS")
  ) {
    return { code: "tls", message: "TLS handshake failed" };
  }
  if (code === "ECONNREFUSED") return { code: "network", message: "Connection refused" };
  if (code === "ECONNRESET") return { code: "network", message: "Connection reset" };
  return { code: "network", message: "Request failed before receiving an HTTP response" };
}

function readErrorCode(error: unknown): string | null {
  const direct = codeOf(error);
  if (direct) return direct;
  if (!error || typeof error !== "object" || !("cause" in error)) return null;
  return codeOf(error.cause);
}

function codeOf(value: unknown): string | null {
  if (!value || typeof value !== "object" || !("code" in value)) return null;
  return typeof value.code === "string" ? value.code : null;
}

function elapsedMs(startedAt: number): number {
  return Math.round(performance.now() - startedAt);
}
