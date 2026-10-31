import { describe, expect, it } from "vitest";
import { formatResponseBytes } from "./format-response-bytes";

describe("formatResponseBytes", () => {
  it("formats bytes under 1 KB as B", () => {
    expect(formatResponseBytes(0)).toBe("0 B");
    expect(formatResponseBytes(512)).toBe("512 B");
  });

  it("formats kilobytes", () => {
    expect(formatResponseBytes(1024)).toBe("1.0 KB");
    expect(formatResponseBytes(10 * 1024)).toBe("10 KB");
  });

  it("formats megabytes", () => {
    expect(formatResponseBytes(1024 * 1024)).toBe("1.0 MB");
    expect(formatResponseBytes(12 * 1024 * 1024)).toBe("12 MB");
  });
});
