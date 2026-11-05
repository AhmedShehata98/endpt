import type { MemberManageOperation, TeamRole } from "./team.types";
import { hasTeamPermission } from "./authorize";

export type CanManageMemberInput = {
  actorRole: TeamRole;
  targetRole: TeamRole;
  /** True when actor is acting on their own membership */
  isSelf: boolean;
  operation: MemberManageOperation;
  /** Required for Owner leave — Business Rules §10.3 */
  hasValidSuccessor?: boolean;
};

export type CanManageMemberResult =
  | { allowed: true }
  | { allowed: false; reason: string };

/**
 * Role Management Matrix — Business Rules §3.1.
 * Holding team.members.change_role / remove is not enough; the matrix must allow the op.
 */
export function canManageMember(input: CanManageMemberInput): CanManageMemberResult {
  const { actorRole, targetRole, isSelf, operation } = input;

  if (operation === "leave") {
    if (!isSelf) {
      return { allowed: false, reason: "LEAVE_SELF_ONLY" };
    }
    if (actorRole === "owner") {
      if (!input.hasValidSuccessor) {
        return { allowed: false, reason: "OWNER_CANNOT_LEAVE_NO_SUCCESSOR" };
      }
      return { allowed: true };
    }
    return { allowed: true };
  }

  if (isSelf) {
    if (actorRole === "owner") {
      return { allowed: false, reason: "OWNER_SELF_CHANGE_VIA_TRANSFER_ONLY" };
    }
    if (actorRole === "admin") {
      if (
        operation === "self_demote_to_editor" ||
        operation === "self_demote_to_viewer" ||
        operation === "demote_to_editor" ||
        operation === "demote_to_viewer"
      ) {
        return { allowed: true };
      }
      return { allowed: false, reason: "ADMIN_CANNOT_SELF_PROMOTE" };
    }
    return { allowed: false, reason: "MEMBER_CANNOT_SELF_CHANGE_ROLE" };
  }

  if (actorRole === "editor" || actorRole === "viewer") {
    return { allowed: false, reason: "NO_ADMIN_OPS" };
  }

  if (targetRole === "owner") {
    return { allowed: false, reason: "CANNOT_MANAGE_OWNER" };
  }

  if (actorRole === "admin") {
    if (targetRole === "admin") {
      return { allowed: false, reason: "ADMIN_CANNOT_MANAGE_ADMIN" };
    }
    if (operation === "promote_to_admin") {
      return { allowed: false, reason: "ADMIN_CANNOT_PROMOTE_ADMIN" };
    }
    if (
      operation === "remove" ||
      operation === "switch_editor_viewer" ||
      operation === "demote_to_editor" ||
      operation === "demote_to_viewer"
    ) {
      if (
        operation === "remove" &&
        !hasTeamPermission(actorRole, "team.members.remove")
      ) {
        return { allowed: false, reason: "permission_denied" };
      }
      if (
        operation !== "remove" &&
        !hasTeamPermission(actorRole, "team.members.change_role")
      ) {
        return { allowed: false, reason: "permission_denied" };
      }
      if (targetRole !== "editor" && targetRole !== "viewer") {
        return { allowed: false, reason: "INVALID_TARGET" };
      }
      return { allowed: true };
    }
    return { allowed: false, reason: "OPERATION_FORBIDDEN" };
  }

  // Owner acting on others
  if (operation === "remove") {
    if (!hasTeamPermission("owner", "team.members.remove")) {
      return { allowed: false, reason: "permission_denied" };
    }
    return { allowed: true };
  }

  if (
    operation === "promote_to_admin" ||
    operation === "demote_to_editor" ||
    operation === "demote_to_viewer" ||
    operation === "switch_editor_viewer"
  ) {
    if (!hasTeamPermission("owner", "team.members.change_role")) {
      return { allowed: false, reason: "permission_denied" };
    }
    if (operation === "promote_to_admin") {
      if (targetRole !== "editor" && targetRole !== "viewer") {
        return { allowed: false, reason: "INVALID_TARGET" };
      }
      return { allowed: true };
    }
    if (operation === "demote_to_editor" || operation === "demote_to_viewer") {
      if (targetRole !== "admin" && targetRole !== "editor" && targetRole !== "viewer") {
        return { allowed: false, reason: "INVALID_TARGET" };
      }
      return { allowed: true };
    }
    if (targetRole === "editor" || targetRole === "viewer") {
      return { allowed: true };
    }
    return { allowed: false, reason: "INVALID_TARGET" };
  }

  return { allowed: false, reason: "OPERATION_FORBIDDEN" };
}

export function roleAfterOperation(
  current: TeamRole,
  operation: MemberManageOperation,
): TeamRole | null {
  switch (operation) {
    case "promote_to_admin":
      return "admin";
    case "demote_to_editor":
    case "self_demote_to_editor":
      return "editor";
    case "demote_to_viewer":
    case "self_demote_to_viewer":
      return "viewer";
    case "switch_editor_viewer":
      return current === "editor" ? "viewer" : current === "viewer" ? "editor" : null;
    default:
      return null;
  }
}
