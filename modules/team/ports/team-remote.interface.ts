import type {
  InvitationRole,
  ProjectRole,
  TeamMembership,
  TeamProject,
  TeamRecord,
  TeamRole,
} from "../types/team.types";

export type TeamCreateInput = { name: string; slug?: string };

export type TeamMutationResult =
  | { status: "ok"; team: TeamRecord }
  | { status: "error"; code: string; message: string };

export type TeamListResult =
  | {
      status: "ok";
      teams: Array<{ team: TeamRecord; membership: TeamMembership }>;
    }
  | { status: "error"; code: string; message: string };

export type MemberChangeRoleInput = {
  teamId: string;
  membershipId: string;
  newRole: Exclude<TeamRole, "owner">;
};

export type MemberRemoveInput = { teamId: string; membershipId: string };

export type InviteCreateInput = {
  teamId: string;
  type: "email" | "link";
  email?: string;
  role: InvitationRole;
  maxUses?: number;
  expiresInHours?: number;
};

export type InviteAcceptInput = { token: string };

export type ClonePersonalToTeamInput = {
  teamId: string;
  sourceProjectId: string;
  name: string;
  collections: Array<{
    id: string;
    name: string;
    requests: Array<{
      id: string;
      name: string;
      method: string;
      url: string;
      config: Record<string, unknown>;
    }>;
  }>;
  environments?: Array<{
    name: string;
    variables: Array<{ key: string; isSecret: boolean; value: string | null }>;
  }>;
};

export type TeamInvitation = {
  id: string;
  teamId: string;
  type: "email" | "link";
  email: string | null;
  role: InvitationRole;
  status: string;
  expiresAt: string;
  maxUses: number;
  usesCount: number;
  /** Present only on create — one-time plaintext token */
  token?: string;
};

export type ProjectMemberRow = {
  kind: "implicit" | "explicit";
  membershipId?: string;
  userId: string;
  role: ProjectRole | "implicit_admin";
};

export interface TeamRemote {
  ping(): Promise<{ ok: true } | { ok: false; message: string }>;

  createTeam(input: TeamCreateInput): Promise<TeamMutationResult>;
  updateTeam(input: {
    teamId: string;
    name: string;
  }): Promise<TeamMutationResult>;
  listMyTeams(): Promise<TeamListResult>;
  listMembers(
    teamId: string,
  ): Promise<
    | { status: "ok"; members: TeamMembership[] }
    | { status: "error"; code: string; message: string }
  >;

  changeMemberRole(
    input: MemberChangeRoleInput,
  ): Promise<{ status: "ok" } | { status: "error"; code: string; message: string }>;
  removeMember(
    input: MemberRemoveInput,
  ): Promise<{ status: "ok" } | { status: "error"; code: string; message: string }>;
  leaveTeam(
    teamId: string,
  ): Promise<{ status: "ok" } | { status: "error"; code: string; message: string }>;

  setSuccessor(input: {
    teamId: string;
    membershipId: string | null;
  }): Promise<{ status: "ok" } | { status: "error"; code: string; message: string }>;
  transferOwnership(input: {
    teamId: string;
    membershipId: string;
  }): Promise<{ status: "ok" } | { status: "error"; code: string; message: string }>;

  createInvitation(
    input: InviteCreateInput,
  ): Promise<
    | { status: "ok"; invitation: TeamInvitation }
    | { status: "error"; code: string; message: string }
  >;
  acceptInvitation(
    input: InviteAcceptInput,
  ): Promise<
    | { status: "ok"; teamId: string; membershipId: string }
    | { status: "error"; code: string; message: string }
  >;
  revokeInvitation(input: {
    teamId: string;
    invitationId: string;
  }): Promise<{ status: "ok" } | { status: "error"; code: string; message: string }>;
  resendInvitation(input: {
    teamId: string;
    invitationId: string;
  }): Promise<
    | { status: "ok"; invitation: TeamInvitation }
    | { status: "error"; code: string; message: string }
  >;

  createTeamProject(input: {
    teamId: string;
    name: string;
  }): Promise<
    | { status: "ok"; project: TeamProject }
    | { status: "error"; code: string; message: string }
  >;
  deleteTeamProject(input: {
    teamId: string;
    projectId: string;
  }): Promise<{ status: "ok" } | { status: "error"; code: string; message: string }>;
  listTeamProjects(
    teamId: string,
  ): Promise<
    | { status: "ok"; projects: TeamProject[] }
    | { status: "error"; code: string; message: string }
  >;
  setProjectMember(input: {
    teamId: string;
    projectId: string;
    teamMembershipId: string;
    role: ProjectRole;
  }): Promise<{ status: "ok" } | { status: "error"; code: string; message: string }>;
  listProjectMembers(input: {
    teamId: string;
    projectId: string;
  }): Promise<
    | { status: "ok"; members: ProjectMemberRow[] }
    | { status: "error"; code: string; message: string }
  >;

  upsertTeamContent(input: {
    teamId: string;
    projectId: string;
    kind: "collection" | "request" | "environment" | "variable" | "execution";
    payload: Record<string, unknown>;
  }): Promise<
    | { status: "ok"; id: string }
    | { status: "error"; code: string; message: string }
  >;

  clonePersonalToTeam(
    input: ClonePersonalToTeamInput,
  ): Promise<
    | { status: "ok"; project: TeamProject; cleared: string[] }
    | { status: "error"; code: string; message: string }
  >;

  softDeleteTeam(
    teamId: string,
  ): Promise<{ status: "ok" } | { status: "error"; code: string; message: string }>;
  restoreTeam(
    teamId: string,
  ): Promise<{ status: "ok" } | { status: "error"; code: string; message: string }>;
}
