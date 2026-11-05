import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFunctions, httpsCallable, type Functions } from "firebase/functions";
import { readFirebaseWebConfig } from "@modules/sync/infrastructure/firebase-sync-remote";
import type {
  ClonePersonalToTeamInput,
  InviteAcceptInput,
  InviteCreateInput,
  MemberChangeRoleInput,
  MemberRemoveInput,
  TeamCreateInput,
  TeamListResult,
  TeamMutationResult,
  TeamRemote,
} from "../ports/team-remote.interface";
import { FakeTeamRemote } from "./fake-team-remote";
import { FirestoreTeamRemote } from "./firestore-team-remote";

type OkOrErr = { status: "ok" } | { status: "error"; code: string; message: string };

type CallableResult<T> = T;

/**
 * TeamRemote over Firebase callable Cloud Functions.
 * Falls back to error responses when Firebase is not configured.
 */
export class FirebaseTeamRemote implements TeamRemote {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private functions: Functions | null = null;

  constructor(
    private readonly config = readFirebaseWebConfig(),
  ) {}

  private ensure(): Functions | null {
    if (!this.config) return null;
    if (!this.functions) {
      this.app = getApps().length ? getApp() : initializeApp(this.config);
      this.auth = getAuth(this.app);
      this.functions = getFunctions(this.app);
    }
    return this.functions;
  }

  private async call<T>(name: string, data?: unknown): Promise<CallableResult<T>> {
    const functions = this.ensure();
    if (!functions) {
      throw new Error("Firebase is not configured");
    }
    if (!this.auth?.currentUser) {
      throw new Error("Not signed in to Firebase");
    }
    const fn = httpsCallable(functions, name);
    const result = await fn(data ?? {});
    return result.data as T;
  }

  private async safe<T>(
    name: string,
    data?: unknown,
  ): Promise<T | { status: "error"; code: string; message: string }> {
    try {
      return await this.call<T>(name, data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Team call failed";
      return { status: "error", code: "REMOTE_ERROR", message };
    }
  }

  async ping() {
    try {
      await this.call("teamPing");
      return { ok: true as const };
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : "ping failed",
      };
    }
  }

  createTeam(input: TeamCreateInput): Promise<TeamMutationResult> {
    return this.safe<TeamMutationResult>("teamCreate", input);
  }

  updateTeam(input: { teamId: string; name: string }): Promise<TeamMutationResult> {
    return this.safe<TeamMutationResult>("teamUpdate", input);
  }

  listMyTeams(): Promise<TeamListResult> {
    return this.safe<TeamListResult>("teamListMine");
  }

  listMembers(teamId: string): ReturnType<TeamRemote["listMembers"]> {
    return this.safe("teamListMembers", { teamId });
  }

  changeMemberRole(input: MemberChangeRoleInput): Promise<OkOrErr> {
    return this.safe<OkOrErr>("memberChangeRole", input);
  }

  removeMember(input: MemberRemoveInput): Promise<OkOrErr> {
    return this.safe<OkOrErr>("memberRemove", input);
  }

  leaveTeam(teamId: string): Promise<OkOrErr> {
    return this.safe<OkOrErr>("memberLeave", { teamId });
  }

  setSuccessor(input: {
    teamId: string;
    membershipId: string | null;
  }): Promise<OkOrErr> {
    return this.safe<OkOrErr>("teamSetSuccessor", input);
  }

  transferOwnership(input: {
    teamId: string;
    membershipId: string;
  }): Promise<OkOrErr> {
    return this.safe<OkOrErr>("teamTransferOwnership", input);
  }

  createInvitation(
    input: InviteCreateInput,
  ): ReturnType<TeamRemote["createInvitation"]> {
    return this.safe("inviteCreate", input);
  }

  acceptInvitation(
    input: InviteAcceptInput,
  ): ReturnType<TeamRemote["acceptInvitation"]> {
    return this.safe("inviteAccept", input);
  }

  revokeInvitation(input: {
    teamId: string;
    invitationId: string;
  }): Promise<OkOrErr> {
    return this.safe<OkOrErr>("inviteRevoke", input);
  }

  resendInvitation(input: {
    teamId: string;
    invitationId: string;
  }): ReturnType<TeamRemote["resendInvitation"]> {
    return this.safe("inviteResend", input);
  }

  createTeamProject(input: {
    teamId: string;
    name: string;
  }): ReturnType<TeamRemote["createTeamProject"]> {
    return this.safe("projectCreate", input);
  }

  deleteTeamProject(input: {
    teamId: string;
    projectId: string;
  }): Promise<OkOrErr> {
    return this.safe<OkOrErr>("projectDelete", input);
  }

  listTeamProjects(teamId: string): ReturnType<TeamRemote["listTeamProjects"]> {
    return this.safe("projectList", { teamId });
  }

  setProjectMember(input: {
    teamId: string;
    projectId: string;
    teamMembershipId: string;
    role: "project_admin" | "project_editor" | "project_viewer";
  }): Promise<OkOrErr> {
    return this.safe<OkOrErr>("projectSetMember", input);
  }

  listProjectMembers(input: {
    teamId: string;
    projectId: string;
  }): ReturnType<TeamRemote["listProjectMembers"]> {
    return this.safe("projectListMembers", input);
  }

  upsertTeamContent(input: {
    teamId: string;
    projectId: string;
    kind: "collection" | "request" | "environment" | "variable" | "execution";
    payload: Record<string, unknown>;
  }): ReturnType<TeamRemote["upsertTeamContent"]> {
    return this.safe("contentUpsert", input);
  }

  clonePersonalToTeam(
    input: ClonePersonalToTeamInput,
  ): ReturnType<TeamRemote["clonePersonalToTeam"]> {
    return this.safe("projectClonePersonal", input);
  }

  softDeleteTeam(teamId: string): Promise<OkOrErr> {
    return this.safe<OkOrErr>("teamSoftDelete", { teamId });
  }

  restoreTeam(teamId: string): Promise<OkOrErr> {
    return this.safe<OkOrErr>("teamRestore", { teamId });
  }
}

/** Default remote for Spark (free): client Firestore. Callables need Blaze. */
export function createDefaultTeamRemote(): TeamRemote {
  const config = readFirebaseWebConfig();
  if (!config) return new FakeTeamRemote();
  return new FirestoreTeamRemote(config);
}
