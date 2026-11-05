import type {
  ProjectMembership,
  ProjectPermission,
  TeamMembership,
  TeamPermission,
  TeamRecord,
  TeamRole,
} from "./team.types";
import { PROJECT_PERMISSIONS, TEAM_PERMISSIONS } from "./permission-map";

export type AuthorizeDenied =
  | { allowed: false; reason: "team_unavailable" }
  | { allowed: false; reason: "not_a_member" }
  | { allowed: false; reason: "permission_denied" };

export type AuthorizeAllowed = { allowed: true };

export type AuthorizeResult = AuthorizeAllowed | AuthorizeDenied;

export type TeamAuthorizeInput = {
  team: Pick<TeamRecord, "status">;
  membership: Pick<TeamMembership, "role" | "endedAt"> | null;
  permission: TeamPermission;
};

/**
 * Effective permission for team-level keys — Business Rules §6 steps 1–3.
 */
export function authorizeTeam(input: TeamAuthorizeInput): AuthorizeResult {
  if (input.team.status !== "active") {
    return { allowed: false, reason: "team_unavailable" };
  }
  if (!input.membership || input.membership.endedAt != null) {
    return { allowed: false, reason: "not_a_member" };
  }
  if (!TEAM_PERMISSIONS[input.permission][input.membership.role]) {
    return { allowed: false, reason: "permission_denied" };
  }
  return { allowed: true };
}

export type ProjectAuthorizeInput = {
  team: Pick<TeamRecord, "status">;
  membership: Pick<TeamMembership, "role" | "endedAt"> | null;
  projectMembership: Pick<ProjectMembership, "role" | "endedAt"> | null;
  permission: ProjectPermission;
  /** When checking history.view_own against another user's execution */
  executionOwnerUserId?: string;
  actorUserId?: string;
};

/**
 * Effective permission for team-project keys — Business Rules §6.
 * Owner/Admin get Implicit Access (all Project Admin permissions + team.projects.delete is separate).
 */
export function authorizeProject(input: ProjectAuthorizeInput): AuthorizeResult {
  if (input.team.status !== "active") {
    return { allowed: false, reason: "team_unavailable" };
  }
  if (!input.membership || input.membership.endedAt != null) {
    return { allowed: false, reason: "not_a_member" };
  }

  const teamRole: TeamRole = input.membership.role;

  if (teamRole === "owner" || teamRole === "admin") {
    if (input.permission === "environment.secret.reveal") {
      return { allowed: false, reason: "permission_denied" };
    }
    if (
      input.permission === "history.view_own" &&
      input.executionOwnerUserId &&
      input.actorUserId &&
      input.executionOwnerUserId !== input.actorUserId
    ) {
      // Owner/Admin also have history.view_all
      return { allowed: true };
    }
    // Implicit Access ≡ Project Admin permissions
    if (PROJECT_PERMISSIONS[input.permission].project_admin) {
      return { allowed: true };
    }
    return { allowed: false, reason: "permission_denied" };
  }

  if (!input.projectMembership || input.projectMembership.endedAt != null) {
    return { allowed: false, reason: "permission_denied" };
  }

  const projectRole = input.projectMembership.role;
  if (!PROJECT_PERMISSIONS[input.permission][projectRole]) {
    return { allowed: false, reason: "permission_denied" };
  }

  if (
    input.permission === "history.view_own" &&
    input.executionOwnerUserId &&
    input.actorUserId &&
    input.executionOwnerUserId !== input.actorUserId
  ) {
    return { allowed: false, reason: "permission_denied" };
  }

  return { allowed: true };
}

export function hasTeamPermission(
  role: TeamRole,
  permission: TeamPermission,
): boolean {
  return TEAM_PERMISSIONS[permission][role];
}
