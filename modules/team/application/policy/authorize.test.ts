import { describe, expect, it } from "vitest";
import { authorizeProject, authorizeTeam } from "./authorize";
import { TEAM_PERMISSIONS, PROJECT_PERMISSIONS } from "./permission-map";
import type { ProjectPermission, TeamPermission, TeamRole } from "../../types/team.types";
import { PROJECT_ROLES, TEAM_ROLES } from "../../types/team.types";

describe("authorizeTeam — §4 matrix", () => {
  for (const permission of Object.keys(TEAM_PERMISSIONS) as TeamPermission[]) {
    for (const role of TEAM_ROLES) {
      const expected = TEAM_PERMISSIONS[permission][role];
      it(`${role} ${expected ? "allows" : "denies"} ${permission}`, () => {
        const result = authorizeTeam({
          team: { status: "active" },
          membership: { role, endedAt: null },
          permission,
        });
        expect(result.allowed).toBe(expected);
      });
    }
  }

  it("rejects soft-deleted team", () => {
    const result = authorizeTeam({
      team: { status: "deleted" },
      membership: { role: "owner", endedAt: null },
      permission: "team.view",
    });
    expect(result).toEqual({ allowed: false, reason: "team_unavailable" });
  });

  it("rejects ended membership", () => {
    const result = authorizeTeam({
      team: { status: "active" },
      membership: { role: "admin", endedAt: "2026-01-01T00:00:00.000Z" },
      permission: "team.view",
    });
    expect(result).toEqual({ allowed: false, reason: "not_a_member" });
  });
});

describe("authorizeProject — §5.1 + §6 implicit access", () => {
  for (const permission of Object.keys(PROJECT_PERMISSIONS) as ProjectPermission[]) {
    for (const role of PROJECT_ROLES) {
      const expected = PROJECT_PERMISSIONS[permission][role];
      it(`project ${role} ${expected ? "allows" : "denies"} ${permission}`, () => {
        const result = authorizeProject({
          team: { status: "active" },
          membership: { role: "editor", endedAt: null },
          projectMembership: { role, endedAt: null },
          permission,
        });
        expect(result.allowed).toBe(expected);
      });
    }
  }

  const implicitRoles: TeamRole[] = ["owner", "admin"];
  for (const teamRole of implicitRoles) {
    it(`${teamRole} has implicit project.view without project membership`, () => {
      const result = authorizeProject({
        team: { status: "active" },
        membership: { role: teamRole, endedAt: null },
        projectMembership: null,
        permission: "project.view",
      });
      expect(result.allowed).toBe(true);
    });

    it(`${teamRole} cannot reveal secrets`, () => {
      const result = authorizeProject({
        team: { status: "active" },
        membership: { role: teamRole, endedAt: null },
        projectMembership: null,
        permission: "environment.secret.reveal",
      });
      expect(result.allowed).toBe(false);
    });
  }

  it("editor without project membership is denied", () => {
    const result = authorizeProject({
      team: { status: "active" },
      membership: { role: "editor", endedAt: null },
      projectMembership: null,
      permission: "project.view",
    });
    expect(result.allowed).toBe(false);
  });

  it("project viewer cannot execute", () => {
    const result = authorizeProject({
      team: { status: "active" },
      membership: { role: "viewer", endedAt: null },
      projectMembership: { role: "project_viewer", endedAt: null },
      permission: "request.execute",
    });
    expect(result.allowed).toBe(false);
  });
});
