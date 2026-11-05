import { isTeamsFeatureEnabled } from "../feature-flag";
import type {
  ClonePersonalToTeamInput,
  InviteCreateInput,
  TeamCreateInput,
  TeamRemote,
} from "../../ports/team-remote.interface";

/** Application façade over TeamRemote — UI and composition call this. */
export class TeamService {
  constructor(private readonly remote: TeamRemote) {}

  ping() {
    return this.remote.ping();
  }

  createTeam(input: TeamCreateInput) {
    if (!isTeamsFeatureEnabled("teams")) {
      return Promise.resolve({
        status: "error" as const,
        code: "FEATURE_DISABLED",
        message: "Teams feature is disabled",
      });
    }
    return this.remote.createTeam(input);
  }

  updateTeam(input: { teamId: string; name: string }) {
    return this.remote.updateTeam(input);
  }

  listMyTeams() {
    return this.remote.listMyTeams();
  }

  listMembers(teamId: string) {
    return this.remote.listMembers(teamId);
  }

  changeMemberRole(input: {
    teamId: string;
    membershipId: string;
    newRole: "admin" | "editor" | "viewer";
  }) {
    return this.remote.changeMemberRole(input);
  }

  removeMember(input: { teamId: string; membershipId: string }) {
    return this.remote.removeMember(input);
  }

  leaveTeam(teamId: string) {
    return this.remote.leaveTeam(teamId);
  }

  setSuccessor(input: { teamId: string; membershipId: string | null }) {
    return this.remote.setSuccessor(input);
  }

  transferOwnership(input: { teamId: string; membershipId: string }) {
    return this.remote.transferOwnership(input);
  }

  createInvitation(input: InviteCreateInput) {
    if (!isTeamsFeatureEnabled("invitations")) {
      return Promise.resolve({
        status: "error" as const,
        code: "FEATURE_DISABLED",
        message: "Invitations feature is disabled",
      });
    }
    return this.remote.createInvitation(input);
  }

  acceptInvitation(token: string) {
    return this.remote.acceptInvitation({ token });
  }

  revokeInvitation(input: { teamId: string; invitationId: string }) {
    return this.remote.revokeInvitation(input);
  }

  resendInvitation(input: { teamId: string; invitationId: string }) {
    return this.remote.resendInvitation(input);
  }

  createTeamProject(input: { teamId: string; name: string }) {
    return this.remote.createTeamProject(input);
  }

  deleteTeamProject(input: { teamId: string; projectId: string }) {
    return this.remote.deleteTeamProject(input);
  }

  listTeamProjects(teamId: string) {
    return this.remote.listTeamProjects(teamId);
  }

  setProjectMember(input: {
    teamId: string;
    projectId: string;
    teamMembershipId: string;
    role: "project_admin" | "project_editor" | "project_viewer";
  }) {
    return this.remote.setProjectMember(input);
  }

  listProjectMembers(input: { teamId: string; projectId: string }) {
    return this.remote.listProjectMembers(input);
  }

  upsertTeamContent(input: {
    teamId: string;
    projectId: string;
    kind: "collection" | "request" | "environment" | "variable" | "execution";
    payload: Record<string, unknown>;
  }) {
    return this.remote.upsertTeamContent(input);
  }

  clonePersonalToTeam(input: ClonePersonalToTeamInput) {
    if (!isTeamsFeatureEnabled("clone")) {
      return Promise.resolve({
        status: "error" as const,
        code: "FEATURE_DISABLED",
        message: "Clone feature is disabled",
      });
    }
    return this.remote.clonePersonalToTeam(input);
  }

  softDeleteTeam(teamId: string) {
    return this.remote.softDeleteTeam(teamId);
  }

  restoreTeam(teamId: string) {
    return this.remote.restoreTeam(teamId);
  }
}
