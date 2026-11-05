import type {
  ProjectPermission,
  ProjectRole,
  TeamPermission,
  TeamRole,
} from "../../types/team.types";

const YES = true;
const NO = false;

/** Team permission matrix — Business Rules §4 */
export const TEAM_PERMISSIONS: Record<TeamPermission, Record<TeamRole, boolean>> = {
  "team.view": { owner: YES, admin: YES, editor: YES, viewer: YES },
  "team.update": { owner: YES, admin: YES, editor: NO, viewer: NO },
  "team.delete": { owner: YES, admin: NO, editor: NO, viewer: NO },
  "team.restore": { owner: YES, admin: NO, editor: NO, viewer: NO },
  "team.ownership.transfer": { owner: YES, admin: NO, editor: NO, viewer: NO },
  "team.successor.manage": { owner: YES, admin: NO, editor: NO, viewer: NO },
  "team.members.view": { owner: YES, admin: YES, editor: YES, viewer: YES },
  "team.members.invite": { owner: YES, admin: YES, editor: NO, viewer: NO },
  "team.members.remove": { owner: YES, admin: YES, editor: NO, viewer: NO },
  "team.members.change_role": { owner: YES, admin: YES, editor: NO, viewer: NO },
  "team.invitations.manage": { owner: YES, admin: YES, editor: NO, viewer: NO },
  "team.projects.create": { owner: YES, admin: YES, editor: NO, viewer: NO },
  "team.projects.delete": { owner: YES, admin: YES, editor: NO, viewer: NO },
  "team.projects.access_all": { owner: YES, admin: YES, editor: NO, viewer: NO },
  "team.audit.view": { owner: YES, admin: YES, editor: NO, viewer: NO },
};

/** Project permission matrix — Business Rules §5.1 */
export const PROJECT_PERMISSIONS: Record<
  ProjectPermission,
  Record<ProjectRole, boolean>
> = {
  "project.view": {
    project_admin: YES,
    project_editor: YES,
    project_viewer: YES,
  },
  "project.settings.manage": {
    project_admin: YES,
    project_editor: NO,
    project_viewer: NO,
  },
  "project.members.manage": {
    project_admin: YES,
    project_editor: NO,
    project_viewer: NO,
  },
  "request.create": {
    project_admin: YES,
    project_editor: YES,
    project_viewer: NO,
  },
  "request.update": {
    project_admin: YES,
    project_editor: YES,
    project_viewer: NO,
  },
  "request.delete": {
    project_admin: YES,
    project_editor: YES,
    project_viewer: NO,
  },
  "request.execute": {
    project_admin: YES,
    project_editor: YES,
    project_viewer: NO,
  },
  "collection.create": {
    project_admin: YES,
    project_editor: YES,
    project_viewer: NO,
  },
  "collection.update": {
    project_admin: YES,
    project_editor: YES,
    project_viewer: NO,
  },
  "collection.delete": {
    project_admin: YES,
    project_editor: YES,
    project_viewer: NO,
  },
  "environment.view": {
    project_admin: YES,
    project_editor: YES,
    project_viewer: YES,
  },
  "environment.manage": {
    project_admin: YES,
    project_editor: YES,
    project_viewer: NO,
  },
  "environment.secret.write": {
    project_admin: YES,
    project_editor: YES,
    project_viewer: NO,
  },
  "environment.secret.reveal": {
    project_admin: NO,
    project_editor: NO,
    project_viewer: NO,
  },
  "history.view_own": {
    project_admin: YES,
    project_editor: YES,
    project_viewer: NO,
  },
  "history.view_all": {
    project_admin: YES,
    project_editor: NO,
    project_viewer: NO,
  },
};

/** Maximum project role by team role — Business Rules §5.2 */
export function maxProjectRoleForTeamRole(
  teamRole: TeamRole,
): ProjectRole | "implicit" | null {
  if (teamRole === "owner" || teamRole === "admin") return "implicit";
  if (teamRole === "editor") return "project_admin";
  if (teamRole === "viewer") return "project_viewer";
  return null;
}

const PROJECT_ROLE_RANK: Record<ProjectRole, number> = {
  project_viewer: 1,
  project_editor: 2,
  project_admin: 3,
};

export function projectRoleWithinCeiling(
  teamRole: TeamRole,
  projectRole: ProjectRole,
): boolean {
  const max = maxProjectRoleForTeamRole(teamRole);
  if (max === "implicit" || max === null) return false;
  return PROJECT_ROLE_RANK[projectRole] <= PROJECT_ROLE_RANK[max];
}
