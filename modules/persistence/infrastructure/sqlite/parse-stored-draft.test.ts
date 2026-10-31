import { describe, expect, it } from "vitest";
import { createEmptyDraft } from "@modules/request";
import { InvalidStoredDraftError, parseStoredDraft } from "./parse-stored-draft";

describe("parseStoredDraft", () => {
  it("accepts a valid draft JSON", () => {
    const draft = createEmptyDraft("POST");
    expect(parseStoredDraft(JSON.stringify(draft))).toEqual(draft);
  });

  it("rejects invalid JSON", () => {
    expect(() => parseStoredDraft("{")).toThrow(InvalidStoredDraftError);
  });

  it("rejects unexpected shape", () => {
    expect(() => parseStoredDraft(JSON.stringify({ url: 1 }))).toThrow(
      InvalidStoredDraftError,
    );
  });
});
