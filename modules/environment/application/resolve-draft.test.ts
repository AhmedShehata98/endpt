import { describe, expect, it } from "vitest";
import { createEmptyDraft } from "@modules/request";
import { resolveDraft } from "./resolve-draft";

describe("resolveDraft", () => {
  it("replaces placeholders in url, params, headers, body, and auth", () => {
    const draft = {
      ...createEmptyDraft("POST"),
      url: "{{baseUrl}}/items",
      queryParams: [{ id: "q1", key: "q", value: "{{apiKey}}", enabled: true }],
      headers: [{ id: "h1", key: "X-User", value: "{{username}}", enabled: true }],
      bodyType: "raw" as const,
      body: "token={{authToken}}",
      auth: {
        ...createEmptyDraft().auth,
        enabled: true,
        type: "basic" as const,
        token: "{{authToken}}",
        apiKey: "{{apiKey}}",
        apiKeyHeader: "{{headerName}}",
        username: "{{username}}",
        password: "{{password}}",
      },
    };

    const resolved = resolveDraft(draft, [
      { key: "baseUrl", value: "https://api.example" },
      { key: "apiKey", value: "k" },
      { key: "username", value: "ada" },
      { key: "authToken", value: "t" },
      { key: "headerName", value: "X-Custom" },
      { key: "password", value: "s" },
    ]);

    expect(resolved.unresolved).toEqual([]);
    expect(resolved.draft.url).toBe("https://api.example/items");
    expect(resolved.draft.queryParams[0]?.value).toBe("k");
    expect(resolved.draft.headers[0]?.value).toBe("ada");
    expect(resolved.draft.body).toBe("token=t");
    expect(resolved.draft.auth).toMatchObject({
      token: "t",
      apiKey: "k",
      apiKeyHeader: "X-Custom",
      username: "ada",
      password: "s",
    });
  });

  it("substitutes a defined empty value and reports a missing key", () => {
    const draft = {
      ...createEmptyDraft(),
      url: "https://example.test/{{baseUrl}}",
      headers: [{ id: "h1", key: "X-Missing", value: "{{nope}}", enabled: true }],
    };

    const resolved = resolveDraft(draft, [{ key: "baseUrl", value: "" }]);

    expect(resolved.draft.url).toBe("https://example.test/");
    expect(resolved.draft.headers[0]?.value).toBe("{{nope}}");
    expect(resolved.unresolved).toEqual(["nope"]);
  });

  it("does not resolve placeholders introduced by a value", () => {
    const draft = { ...createEmptyDraft(), url: "{{baseUrl}}/items" };

    const resolved = resolveDraft(draft, [
      { key: "baseUrl", value: "https://example.test/{{path}}" },
    ]);

    expect(resolved.draft.url).toBe("https://example.test/{{path}}/items");
    expect(resolved.unresolved).toEqual([]);
  });

  it("inserts values that look like replacement patterns literally", () => {
    const draft = { ...createEmptyDraft(), url: "https://example.test/{{baseUrl}}" };

    const resolved = resolveDraft(draft, [{ key: "baseUrl", value: "a$&b" }]);

    expect(resolved.draft.url).toBe("https://example.test/a$&b");
  });

  it("leaves param and header keys unchanged", () => {
    const draft = {
      ...createEmptyDraft(),
      url: "https://example.test",
      queryParams: [{ id: "q1", key: "{{baseUrl}}", value: "1", enabled: true }],
      headers: [{ id: "h1", key: "{{baseUrl}}", value: "1", enabled: true }],
    };

    const resolved = resolveDraft(draft, [{ key: "baseUrl", value: "https://api.example" }]);

    expect(resolved.draft.queryParams[0]?.key).toBe("{{baseUrl}}");
    expect(resolved.draft.headers[0]?.key).toBe("{{baseUrl}}");
  });
});
