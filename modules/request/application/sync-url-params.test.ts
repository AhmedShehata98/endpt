import { describe, expect, it } from "vitest";
import type { KeyValuePair } from "../types/http.types";
import { syncParamsFromUrl, syncUrlFromParams } from "./sync-url-params";

function pair(
  id: string,
  key: string,
  value: string,
  enabled = true,
): KeyValuePair {
  return { id, key, value, enabled };
}

describe("syncParamsFromUrl", () => {
  it("rebuilds enabled params from the URL query and keeps disabled rows", () => {
    const params = [
      pair("a", "page", "1"),
      pair("b", "debug", "true", false),
      pair("c", "old", "x"),
    ];

    const next = syncParamsFromUrl(
      "https://api.example.com/items?page=2&sort=name",
      params,
      () => "new-id",
    );

    expect(next).toEqual([
      pair("a", "page", "2"),
      pair("c", "sort", "name"),
      pair("b", "debug", "true", false),
    ]);
  });

  it("clears enabled params when the URL has no query", () => {
    const params = [pair("a", "page", "1"), pair("b", "x", "y", false)];
    expect(syncParamsFromUrl("https://api.example.com/items", params)).toEqual([
      pair("b", "x", "y", false),
    ]);
  });
});

describe("syncUrlFromParams", () => {
  it("writes only enabled params into the URL query", () => {
    const params = [
      pair("a", "page", "2"),
      pair("b", "debug", "true", false),
      pair("c", "sort", "name"),
    ];

    expect(syncUrlFromParams("https://api.example.com/items?old=1", params)).toBe(
      "https://api.example.com/items?page=2&sort=name",
    );
  });

  it("preserves a hash fragment when rewriting the query", () => {
    const params = [pair("a", "q", "1")];
    expect(syncUrlFromParams("https://api.example.com/path?x=0#section", params)).toBe(
      "https://api.example.com/path?q=1#section",
    );
  });
});
