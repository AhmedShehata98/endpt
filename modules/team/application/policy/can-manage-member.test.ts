import { describe, expect, it } from "vitest";
import { canManageMember } from "./can-manage-member";

describe("canManageMember — §3.1 matrix", () => {
  it("Owner can demote Admin", () => {
    expect(
      canManageMember({
        actorRole: "owner",
        targetRole: "admin",
        isSelf: false,
        operation: "demote_to_editor",
      }).allowed,
    ).toBe(true);
  });

  it("Owner can remove Admin", () => {
    expect(
      canManageMember({
        actorRole: "owner",
        targetRole: "admin",
        isSelf: false,
        operation: "remove",
      }).allowed,
    ).toBe(true);
  });

  it("Owner can promote Editor to Admin", () => {
    expect(
      canManageMember({
        actorRole: "owner",
        targetRole: "editor",
        isSelf: false,
        operation: "promote_to_admin",
      }).allowed,
    ).toBe(true);
  });

  it("Owner cannot change own role except leave with successor", () => {
    expect(
      canManageMember({
        actorRole: "owner",
        targetRole: "owner",
        isSelf: true,
        operation: "demote_to_admin" as never,
      }).allowed,
    ).toBe(false);

    expect(
      canManageMember({
        actorRole: "owner",
        targetRole: "owner",
        isSelf: true,
        operation: "leave",
        hasValidSuccessor: false,
      }),
    ).toEqual({ allowed: false, reason: "OWNER_CANNOT_LEAVE_NO_SUCCESSOR" });

    expect(
      canManageMember({
        actorRole: "owner",
        targetRole: "owner",
        isSelf: true,
        operation: "leave",
        hasValidSuccessor: true,
      }).allowed,
    ).toBe(true);
  });

  it("Admin cannot manage Owner or another Admin", () => {
    expect(
      canManageMember({
        actorRole: "admin",
        targetRole: "owner",
        isSelf: false,
        operation: "remove",
      }).allowed,
    ).toBe(false);
    expect(
      canManageMember({
        actorRole: "admin",
        targetRole: "admin",
        isSelf: false,
        operation: "remove",
      }).allowed,
    ).toBe(false);
  });

  it("Admin cannot promote to Admin", () => {
    expect(
      canManageMember({
        actorRole: "admin",
        targetRole: "editor",
        isSelf: false,
        operation: "promote_to_admin",
      }).allowed,
    ).toBe(false);
  });

  it("Admin can switch Editor/Viewer and remove them", () => {
    expect(
      canManageMember({
        actorRole: "admin",
        targetRole: "editor",
        isSelf: false,
        operation: "switch_editor_viewer",
      }).allowed,
    ).toBe(true);
    expect(
      canManageMember({
        actorRole: "admin",
        targetRole: "viewer",
        isSelf: false,
        operation: "remove",
      }).allowed,
    ).toBe(true);
  });

  it("Admin can self-demote and leave", () => {
    expect(
      canManageMember({
        actorRole: "admin",
        targetRole: "admin",
        isSelf: true,
        operation: "self_demote_to_editor",
      }).allowed,
    ).toBe(true);
    expect(
      canManageMember({
        actorRole: "admin",
        targetRole: "admin",
        isSelf: true,
        operation: "leave",
      }).allowed,
    ).toBe(true);
  });

  it("Editor/Viewer can only leave", () => {
    expect(
      canManageMember({
        actorRole: "editor",
        targetRole: "viewer",
        isSelf: false,
        operation: "remove",
      }).allowed,
    ).toBe(false);
    expect(
      canManageMember({
        actorRole: "viewer",
        targetRole: "viewer",
        isSelf: true,
        operation: "leave",
      }).allowed,
    ).toBe(true);
  });
});
