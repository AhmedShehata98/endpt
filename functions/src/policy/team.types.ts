export type TeamRole = "owner" | "admin" | "editor" | "viewer";
export type ProjectRole = "project_admin" | "project_editor" | "project_viewer";
export type InvitationRole = "admin" | "editor" | "viewer";
export type TeamStatus = "active" | "deleted" | "deleting";

export type TeamPermission =
  | "team.view"
  | "team.update"
  | "team.delete"
  | "team.restore"
  | "team.ownership.transfer"
  | "team.successor.manage"
  | "team.members.view"
  | "team.members.invite"
  | "team.members.remove"
  | "team.members.change_role"
  | "team.invitations.manage"
  | "team.projects.create"
  | "team.projects.delete"
  | "team.projects.access_all"
  | "team.audit.view";

export type ProjectPermission =
  | "project.view"
  | "project.settings.manage"
  | "project.members.manage"
  | "request.create"
  | "request.update"
  | "request.delete"
  | "request.execute"
  | "collection.create"
  | "collection.update"
  | "collection.delete"
  | "environment.view"
  | "environment.manage"
  | "environment.secret.write"
  | "environment.secret.reveal"
  | "history.view_own"
  | "history.view_all";

export type MemberManageOperation =
  | "demote_to_editor"
  | "demote_to_viewer"
  | "promote_to_admin"
  | "switch_editor_viewer"
  | "remove"
  | "leave"
  | "self_demote_to_editor"
  | "self_demote_to_viewer";

export interface TeamRecord {
  id: string;
  name: string;
  slug: string;
  status: TeamStatus;
  successorMembershipId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  purgeAfter: string | null;
}

export interface TeamMembership {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: string;
  endedAt: string | null;
  endReason: string | null;
}

export interface ProjectMembership {
  id: string;
  projectId: string;
  teamId: string;
  teamMembershipId: string;
  role: ProjectRole;
  startedAt: string;
  endedAt: string | null;
  endReason: string | null;
}

export interface TeamProject {
  id: string;
  teamId: string;
  name: string;
  settings: Record<string, unknown>;
  sourceProjectId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const TEAM_ROLES: readonly TeamRole[] = [
  "owner",
  "admin",
  "editor",
  "viewer",
] as const;

export const PROJECT_ROLES: readonly ProjectRole[] = [
  "project_admin",
  "project_editor",
  "project_viewer",
] as const;
