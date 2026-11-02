import { describe, expect, it } from "vitest";
import {
  findActiveMention,
  findPlaceholderAt,
  formatMentionPopoverValue,
  insertMention,
  splitMentionSegments,
} from "./MentionInput";

describe("findActiveMention", () => {
  it("detects an open mention at the cursor", () => {
    expect(findActiveMention("{{bas", 5)).toEqual({ start: 0, query: "bas" });
    expect(findActiveMention("{{", 2)).toEqual({ start: 0, query: "" });
  });

  it("ignores completed placeholders", () => {
    expect(findActiveMention("{{baseUrl}}/api", 15)).toBeNull();
  });

  it("detects a second open mention", () => {
    expect(findActiveMention("{{baseUrl}}/{{pa", 16)).toEqual({
      start: 12,
      query: "pa",
    });
  });
});

describe("insertMention", () => {
  it("replaces the open mention with the selected key", () => {
    expect(insertMention("{{bas", { start: 0, query: "bas" }, 5, "baseUrl")).toEqual({
      value: "{{baseUrl}}",
      cursor: 11,
    });
  });

  it("preserves surrounding text", () => {
    expect(
      insertMention("{{baseUrl}}/{{pa", { start: 12, query: "pa" }, 16, "path"),
    ).toEqual({
      value: "{{baseUrl}}/{{path}}",
      cursor: 20,
    });
  });
});

describe("findPlaceholderAt", () => {
  it("returns the placeholder under the character index", () => {
    expect(findPlaceholderAt("{{baseUrl}}/api", 3)).toEqual({
      key: "baseUrl",
      start: 0,
      end: 11,
    });
  });

  it("returns null outside placeholders", () => {
    expect(findPlaceholderAt("{{baseUrl}}/api", 12)).toBeNull();
  });
});

describe("formatMentionPopoverValue", () => {
  it("shows the resolved env value", () => {
    const env = new Map([["baseUrl", "https://example.com"]]);
    expect(formatMentionPopoverValue("baseUrl", env)).toBe("https://example.com");
  });

  it("masks secret keys", () => {
    const env = new Map([["authToken", "super-secret"]]);
    expect(formatMentionPopoverValue("authToken", env)).toBe("••••••••");
  });

  it("reports missing keys", () => {
    expect(formatMentionPopoverValue("missing", new Map())).toBe("Not defined");
  });
});

describe("splitMentionSegments", () => {
  it("splits text and mention tokens", () => {
    expect(splitMentionSegments("{{baseUrl}}/api")).toEqual([
      { type: "mention", value: "{{baseUrl}}", key: "baseUrl", start: 0, end: 11 },
      { type: "text", value: "/api", start: 11, end: 15 },
    ]);
  });
});
