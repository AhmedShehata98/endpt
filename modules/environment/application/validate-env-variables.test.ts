import { describe, expect, it } from "vitest";
import type { EnvironmentVariable } from "../types/environment.types";
import {
  isValidEnvKey,
  roleForDefaultKey,
  unusedEnvRoles,
  validateEnvVariables,
} from "./validate-env-variables";

function variable(
  overrides: Partial<EnvironmentVariable> & Pick<EnvironmentVariable, "id" | "key" | "role">,
): EnvironmentVariable {
  return {
    userId: null,
    value: "",
    updatedAt: "2026-01-01T00:00:00.000Z",
    deletedAt: null,
    ...overrides,
  };
}

describe("validateEnvVariables", () => {
  it("returns no issues for unique keys", () => {
    expect(
      validateEnvVariables([
        variable({ id: "1", key: "authToken", role: "authToken" }),
        variable({ id: "2", key: "baseUrl", role: "baseUrl" }),
      ]),
    ).toEqual([]);
  });

  it("flags every row that shares a duplicate key", () => {
    const issues = validateEnvVariables([
      variable({ id: "1", key: "authToken", role: "authToken" }),
      variable({ id: "2", key: "authToken", role: "apiKey" }),
    ]);

    expect(issues).toEqual([
      { id: "1", field: "key", message: 'Key "authToken" is already in use' },
      { id: "2", field: "key", message: 'Key "authToken" is already in use' },
    ]);
  });

  it("ignores soft-deleted rows when checking uniqueness", () => {
    expect(
      validateEnvVariables([
        variable({ id: "1", key: "authToken", role: "authToken" }),
        variable({
          id: "2",
          key: "authToken",
          role: "apiKey",
          deletedAt: "2026-01-02T00:00:00.000Z",
        }),
      ]),
    ).toEqual([]);
  });

  it("flags empty keys", () => {
    expect(validateEnvVariables([variable({ id: "1", key: "", role: "custom" })])).toEqual([
      { id: "1", field: "key", message: "Key is required" },
    ]);
  });

  it("flags invalid keys", () => {
    expect(
      validateEnvVariables([variable({ id: "1", key: "bad-key", role: "custom" })]),
    ).toEqual([{ id: "1", field: "key", message: 'Key "bad-key" is invalid' }]);
  });
});

describe("isValidEnvKey", () => {
  it("accepts placeholder-compatible keys", () => {
    expect(isValidEnvKey("authToken")).toBe(true);
    expect(isValidEnvKey("_private")).toBe(true);
    expect(isValidEnvKey("header_1")).toBe(true);
  });

  it("rejects empty or invalid keys", () => {
    expect(isValidEnvKey("")).toBe(false);
    expect(isValidEnvKey("1start")).toBe(false);
    expect(isValidEnvKey("bad-key")).toBe(false);
  });
});

describe("unusedEnvRoles", () => {
  it("returns all fixed roles when the list is empty", () => {
    expect(unusedEnvRoles([])).toEqual([
      "authToken",
      "apiKey",
      "username",
      "password",
      "baseUrl",
    ]);
  });

  it("excludes fixed roles already present", () => {
    expect(
      unusedEnvRoles([
        variable({ id: "1", key: "authToken", role: "authToken" }),
        variable({ id: "2", key: "baseUrl", role: "baseUrl" }),
      ]),
    ).toEqual(["apiKey", "username", "password"]);
  });

  it("ignores custom roles when computing unused fixed suggestions", () => {
    expect(
      unusedEnvRoles([
        variable({ id: "1", key: "myKey", role: "custom" }),
        variable({ id: "2", key: "other", role: "custom" }),
      ]),
    ).toEqual(["authToken", "apiKey", "username", "password", "baseUrl"]);
  });

  it("treats soft-deleted roles as unused", () => {
    expect(
      unusedEnvRoles([
        variable({
          id: "1",
          key: "authToken",
          role: "authToken",
          deletedAt: "2026-01-02T00:00:00.000Z",
        }),
      ]),
    ).toEqual(["authToken", "apiKey", "username", "password", "baseUrl"]);
  });
});

describe("roleForDefaultKey", () => {
  it("maps default keys to roles", () => {
    expect(roleForDefaultKey("baseUrl")).toBe("baseUrl");
    expect(roleForDefaultKey("apiKey")).toBe("apiKey");
  });

  it("returns null for unknown keys", () => {
    expect(roleForDefaultKey("custom")).toBeNull();
    expect(roleForDefaultKey("myHeader")).toBeNull();
  });
});
