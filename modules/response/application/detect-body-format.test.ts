import { describe, expect, it } from "vitest";
import { detectBodyFormat } from "./detect-body-format";

describe("detectBodyFormat", () => {
  it("detects json from application/json and +json types", () => {
    expect(detectBodyFormat("application/json")).toBe("json");
    expect(detectBodyFormat("application/json; charset=utf-8")).toBe("json");
    expect(detectBodyFormat("application/vnd.api+json")).toBe("json");
  });

  it("detects html from html and xhtml types", () => {
    expect(detectBodyFormat("text/html")).toBe("html");
    expect(detectBodyFormat("TEXT/HTML; charset=utf-8")).toBe("html");
    expect(detectBodyFormat("application/xhtml+xml")).toBe("html");
  });

  it("falls back to raw when the type is missing or unknown", () => {
    expect(detectBodyFormat(null)).toBe("raw");
    expect(detectBodyFormat("text/plain")).toBe("raw");
    expect(detectBodyFormat("application/json-seq")).toBe("raw");
  });
});
