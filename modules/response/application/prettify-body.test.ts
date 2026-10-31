import { describe, expect, it } from "vitest";
import { prettifyBody } from "./prettify-body";

describe("prettifyBody", () => {
  it("prettifies valid JSON with indentation", () => {
    const result = prettifyBody('{"a":1,"b":[2]}', "json");
    expect(result.format).toBe("json");
    expect(result.text).toBe('{\n  "a": 1,\n  "b": [\n    2\n  ]\n}');
  });

  it("falls back to raw when JSON is invalid", () => {
    const body = "{not-json";
    const result = prettifyBody(body, "json");
    expect(result.format).toBe("raw");
    expect(result.text).toBe(body);
  });

  it("prettifies simple HTML with nesting", () => {
    const result = prettifyBody("<div><p>Hi</p></div>", "html");
    expect(result.format).toBe("html");
    expect(result.text).toBe("<div>\n  <p>\n    Hi\n  </p>\n</div>");
  });

  it("keeps void tags from increasing indent", () => {
    const result = prettifyBody("<div><br><span>x</span></div>", "html");
    expect(result.text).toBe("<div>\n  <br>\n  <span>\n    x\n  </span>\n</div>");
  });

  it("passes raw bodies through unchanged", () => {
    const body = "plain text";
    expect(prettifyBody(body, "raw")).toEqual({ text: body, format: "raw" });
  });

  it("returns empty bodies unchanged", () => {
    expect(prettifyBody("", "json")).toEqual({ text: "", format: "json" });
  });
});
