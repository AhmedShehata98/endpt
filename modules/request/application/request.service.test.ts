import { describe, expect, it } from "vitest";
import { createEmptyAuthConfig, createEmptyDraft, type RequestDraft } from "../types/http.types";
import type { HttpClient, PreparedRequest, TransportResult } from "../ports/http-client.interface";
import { RequestService } from "./request.service";

describe("RequestService", () => {
  it("sends the method and only enabled params and headers", async () => {
    const client = new RecordingClient();
    const result = await new RequestService(client).send(
      draft({
        method: "PATCH",
        url: "https://example.test/search?keep=1",
        queryParams: [
          { id: "q1", key: "a", value: "1", enabled: true },
          { id: "q2", key: "b", value: "2", enabled: false },
        ],
        headers: [
          { id: "h1", key: "X-On", value: "yes", enabled: true },
          { id: "h2", key: "X-Off", value: "no", enabled: false },
        ],
      }),
      [],
    );

    expect(result.status).toBe("http-response");
    expect(client.sent[0]).toMatchObject({
      method: "PATCH",
      url: "https://example.test/search?a=1",
      headers: [{ key: "X-On", value: "yes" }],
      body: null,
    });
  });

  it("keeps the URL query string when the params list is empty", async () => {
    const client = new RecordingClient();
    await new RequestService(client).send(draft({ url: "https://example.test/search?keep=1" }), []);
    expect(client.sent[0]?.url).toBe("https://example.test/search?keep=1");
  });

  it("omits auth headers when auth is disabled", async () => {
    const client = new RecordingClient();
    await new RequestService(client).send(
      draft({
        headers: [{ id: "h1", key: "Authorization", value: "from-user", enabled: true }],
        auth: { ...createEmptyAuthConfig(), enabled: false, token: "secret" },
      }),
      [],
    );
    expect(client.sent[0]?.headers).toEqual([{ key: "Authorization", value: "from-user" }]);
  });

  it("applies bearer, api key, and basic auth", async () => {
    const bearer = new RecordingClient();
    await new RequestService(bearer).send(
      draft({
        headers: [{ id: "h1", key: "authorization", value: "stale", enabled: true }],
        auth: { ...createEmptyAuthConfig(), enabled: true, type: "bearerToken", token: "t" },
      }),
      [],
    );
    expect(bearer.sent[0]?.headers).toEqual([{ key: "Authorization", value: "Bearer t" }]);

    const apiKey = new RecordingClient();
    await new RequestService(apiKey).send(
      draft({
        auth: {
          ...createEmptyAuthConfig(),
          enabled: true,
          type: "apiKey",
          apiKey: "k",
          apiKeyHeader: "X-Token",
        },
      }),
      [],
    );
    expect(apiKey.sent[0]?.headers).toEqual([{ key: "X-Token", value: "k" }]);

    const basic = new RecordingClient();
    await new RequestService(basic).send(
      draft({
        auth: {
          ...createEmptyAuthConfig(),
          enabled: true,
          type: "basic",
          username: "ü",
          password: "p",
        },
      }),
      [],
    );
    const credentials = basic.sent[0]?.headers[0]?.value ?? "";
    expect(credentials.startsWith("Basic ")).toBe(true);
    expect(decodeBasic(credentials.slice("Basic ".length))).toBe("ü:p");
  });

  it("sends a body for DELETE and JSON, and omits it for GET", async () => {
    const json = new RecordingClient();
    await new RequestService(json).send(draft({ bodyType: "json", body: '{"ok":true}' }), []);
    expect(json.sent[0]).toMatchObject({
      body: '{"ok":true}',
      headers: [{ key: "Content-Type", value: "application/json" }],
    });

    const customType = new RecordingClient();
    await new RequestService(customType).send(
      draft({
        bodyType: "json",
        body: '{"ok":true}',
        headers: [
          { id: "h1", key: "Content-Type", value: "application/vnd.custom+json", enabled: true },
        ],
      }),
      [],
    );
    expect(customType.sent[0]?.headers).toEqual([
      { key: "Content-Type", value: "application/vnd.custom+json" },
    ]);

    const deleted = new RecordingClient();
    await new RequestService(deleted).send(
      draft({ method: "DELETE", bodyType: "raw", body: "gone" }),
      [],
    );
    expect(deleted.sent[0]?.body).toBe("gone");

    const get = new RecordingClient();
    await new RequestService(get).send(draft({ method: "GET", bodyType: "json", body: "{" }), []);
    expect(get.sent[0]).toMatchObject({ body: null, headers: [] });
  });

  it("does not send when the URL or JSON body is invalid", async () => {
    const client = new RecordingClient();
    const service = new RequestService(client);

    const url = await service.send(draft({ url: "ftp://example.test" }), []);
    const body = await service.send(draft({ bodyType: "json", body: "{" }), []);

    expect(url).toMatchObject({
      status: "invalid",
      issues: [{ field: "url", message: "Enter an http or https URL" }],
    });
    expect(body).toMatchObject({
      status: "invalid",
      issues: [{ field: "body", message: "Body is not valid JSON" }],
    });
    expect(client.sent).toHaveLength(0);
  });

  it("does not send when enabled auth is incomplete", async () => {
    const client = new RecordingClient();
    const result = await new RequestService(client).send(
      draft({
        auth: { ...createEmptyAuthConfig(), enabled: true, type: "bearerToken", token: "  " },
      }),
      [],
    );
    expect(result).toMatchObject({
      status: "invalid",
      issues: [{ field: "auth", message: "Token is required" }],
    });
    expect(client.sent).toHaveLength(0);
  });

  it("rejects an enabled header with an invalid name", async () => {
    const result = await new RequestService(new RecordingClient()).send(
      draft({ headers: [{ id: "h1", key: "Bad Name", value: "x", enabled: true }] }),
      [],
    );
    expect(result).toMatchObject({
      status: "invalid",
      issues: [{ field: "header", message: 'Header name "Bad Name" is invalid' }],
    });
  });

  it("sends unresolved placeholders and reports their keys", async () => {
    const client = new RecordingClient();
    const result = await new RequestService(client).send(
      draft({
        url: "https://example.test/{{missing}}",
        headers: [{ id: "h1", key: "X-Token", value: "{{authToken}}", enabled: true }],
      }),
      [{ key: "authToken", value: "" }],
    );

    expect(result).toMatchObject({ status: "http-response", unresolved: ["missing"] });
    expect(client.sent[0]).toMatchObject({
      url: "https://example.test/{{missing}}",
      headers: [{ key: "X-Token", value: "" }],
    });
  });

  it("treats HTTP 4xx and 5xx as responses", async () => {
    const client = new RecordingClient();
    client.result = httpResponse({ status: 404, statusText: "Not Found", body: "no" });
    const missing = await new RequestService(client).send(draft(), []);
    client.result = httpResponse({
      status: 500,
      statusText: "Server Error",
      contentType: "text/html",
      body: "<p>down</p>",
    });
    const failed = await new RequestService(client).send(draft(), []);

    expect(missing).toMatchObject({
      status: "http-response",
      response: { status: 404, errorMessage: null, bodyFormat: "raw" },
    });
    expect(failed).toMatchObject({
      status: "http-response",
      response: { status: 500, bodyFormat: "html", errorMessage: null },
    });
  });

  it("maps timeout and network failures to network-error", async () => {
    const client = new RecordingClient();
    client.result = {
      kind: "transport-error",
      code: "timeout",
      message: "Request timed out",
      durationMs: 30_000,
    };
    const timeout = await new RequestService(client).send(draft(), []);
    client.result = {
      kind: "transport-error",
      code: "network",
      message: "Connection refused",
      durationMs: 4,
    };
    const network = await new RequestService(client).send(draft(), []);

    expect(timeout).toEqual({
      status: "network-error",
      message: "Request timed out",
      durationMs: 30_000,
      unresolved: [],
    });
    expect(network).toMatchObject({ status: "network-error", message: "Connection refused" });
  });

  it("hides the request URL when the client throws", async () => {
    const client: HttpClient = {
      async send() {
        throw new Error("https://example.test/secret?token=1");
      },
    };
    const result = await new RequestService(client).send(draft(), []);
    expect(result).toMatchObject({
      status: "network-error",
      message: "Request failed before receiving an HTTP response",
    });
  });

  it("ignores a result when a newer send is already in flight", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const client: HttpClient = {
      async send() {
        await gate;
        return httpResponse({ status: 200 });
      },
    };
    const service = new RequestService(client);
    const first = service.send(draft(), []);
    const second = service.send(draft(), []);
    release();

    await expect(first).resolves.toEqual({ status: "superseded" });
    await expect(second).resolves.toMatchObject({ status: "http-response" });
  });
});

class RecordingClient implements HttpClient {
  readonly sent: PreparedRequest[] = [];
  result: TransportResult = httpResponse({ status: 200 });

  async send(request: PreparedRequest): Promise<TransportResult> {
    this.sent.push(request);
    return this.result;
  }
}

function draft(overrides: Partial<RequestDraft> = {}): RequestDraft {
  return { ...createEmptyDraft("POST"), url: "https://example.test/items", ...overrides };
}

function httpResponse(
  overrides: Partial<Extract<TransportResult, { kind: "response" }>>,
): TransportResult {
  return {
    kind: "response",
    status: 200,
    statusText: "OK",
    headers: [],
    body: "",
    contentType: null,
    durationMs: 5,
    ...overrides,
  };
}

function decodeBasic(encoded: string): string {
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
