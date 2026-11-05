export type {
  TeamRole,
  ProjectRole,
  InvitationRole,
  TeamStatus,
  TeamPermission,
  ProjectPermission,
  MemberManageOperation,
  TeamRecord,
  TeamMembership,
  ProjectMembership,
  TeamProject,
} from "./types/team.types";
export { TEAM_ROLES, PROJECT_ROLES } from "./types/team.types";

export {
  TEAM_PERMISSIONS,
  PROJECT_PERMISSIONS,
  maxProjectRoleForTeamRole,
  projectRoleWithinCeiling,
  authorizeTeam,
  authorizeProject,
  hasTeamPermission,
  canManageMember,
  roleAfterOperation,
} from "./application/policy";

export type { TeamRemote } from "./ports/team-remote.interface";
export type {
  TeamCreateInput,
  TeamMutationResult,
  TeamListResult,
  MemberChangeRoleInput,
  MemberRemoveInput,
  InviteCreateInput,
  InviteAcceptInput,
  ClonePersonalToTeamInput,
} from "./ports/team-remote.interface";

export { TeamService } from "./application/services/team.service";
export { FakeTeamRemote } from "./infrastructure/fake-team-remote";
export { FirestoreTeamRemote } from "./infrastructure/firestore-team-remote";
export {
  FirebaseTeamRemote,
  createDefaultTeamRemote,
} from "./infrastructure/firebase-team-remote";
export {
  isTeamsFeatureEnabled,
  setTeamsFeatureFlags,
  resetTeamsFeatureFlags,
} from "./application/feature-flag";
