import { authorizeTeam } from "../application/policy/authorize";
import {
  canManageMember,
  roleAfterOperation,
} from "../application/policy/can-manage-member";
import { projectRoleWithinCeiling } from "../application/policy/permission-map";
import { isTeamsFeatureEnabled } from "../application/feature-flag";
import type {
  ClonePersonalToTeamInput,
  InviteAcceptInput,
  InviteCreateInput,
  MemberChangeRoleInput,
  MemberRemoveInput,
  TeamCreateInput,
  TeamInvitation,
  TeamRemote,
} from "../ports/team-remote.interface";
import type {
  ProjectMembership,
  ProjectRole,
  TeamMembership,
  TeamProject,
  TeamRecord,
  TeamRole,
} from "../types/team.types";

type InviteRecord = TeamInvitation & {
  tokenHash: string;
  createdBy: string;
  revokedAt: string | null;
  revokeReason: string | null;
  replacedById: string | null;
};

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "team";
}

function hashToken(token: string): string {
  // Deterministic non-crypto hash for fake/tests only
  let h = 0;
  for (let i = 0; i < token.length; i++) h = (h * 31 + token.charCodeAt(i)) | 0;
  return `h${Math.abs(h)}`;
}

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "proxy-authorization",
]);

/**
 * In-memory TeamRemote for unit tests and non-Firebase sessions.
 * Enforces the same policy helpers Cloud Functions use.
 */
export class FakeTeamRemote implements TeamRemote {
  private readonly teams = new Map<string, TeamRecord>();
  private readonly memberships = new Map<string, TeamMembership>();
  private readonly invites = new Map<string, InviteRecord>();
  private readonly inviteTokens = new Map<string, string>(); // hash -> id
  private readonly projects = new Map<string, TeamProject>();
  private readonly projectMembers = new Map<string, ProjectMembership>();
  private readonly content = new Map<string, Record<string, unknown>>();
  private readonly slugs = new Set<string>();

  constructor(
    private userId: string = "user-1",
    private readonly createId: () => string = () => crypto.randomUUID(),
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  setUserId(userId: string): void {
    this.userId = userId;
  }

  async ping(): Promise<{ ok: true }> {
    return { ok: true };
  }

  async createTeam(input: TeamCreateInput) {
    if (!isTeamsFeatureEnabled("teams")) {
      return { status: "error" as const, code: "FEATURE_DISABLED", message: "Teams disabled" };
    }
    const name = input.name.trim();
    if (!name) {
      return { status: "error" as const, code: "INVALID", message: "Name required" };
    }
    let slug = (input.slug?.trim() || slugify(name)).toLowerCase();
    if (this.slugs.has(slug)) {
      slug = `${slug}-${this.createId().slice(0, 6)}`;
    }
    const now = this.now();
    const teamId = this.createId();
    const membershipId = this.createId();
    const team: TeamRecord = {
      id: teamId,
      name,
      slug,
      status: "active",
      successorMembershipId: null,
      createdBy: this.userId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      purgeAfter: null,
    };
    const membership: TeamMembership = {
      id: membershipId,
      teamId,
      userId: this.userId,
      role: "owner",
      joinedAt: now,
      endedAt: null,
      endReason: null,
    };
    this.teams.set(teamId, team);
    this.memberships.set(membershipId, membership);
    this.slugs.add(slug);
    return { status: "ok" as const, team };
  }

  async updateTeam(input: { teamId: string; name: string }) {
    const gate = this.requireTeamPermission(input.teamId, "team.update");
    if (gate.status === "error") return gate;
    const name = input.name.trim();
    if (!name) {
      return { status: "error" as const, code: "INVALID", message: "Name required" };
    }
    const team = { ...gate.team, name, updatedAt: this.now() };
    this.teams.set(team.id, team);
    return { status: "ok" as const, team };
  }

  async listMyTeams() {
    const teams: Array<{ team: TeamRecord; membership: TeamMembership }> = [];
    for (const m of this.memberships.values()) {
      if (m.userId !== this.userId || m.endedAt != null) continue;
      const team = this.teams.get(m.teamId);
      if (!team || team.status !== "active") continue;
      teams.push({ team, membership: m });
    }
    return { status: "ok" as const, teams };
  }

  async listMembers(teamId: string) {
    const gate = this.requireTeamPermission(teamId, "team.members.view");
    if (gate.status === "error") return gate;
    const members = [...this.memberships.values()].filter(
      (m) => m.teamId === teamId && m.endedAt == null,
    );
    return { status: "ok" as const, members };
  }

  async changeMemberRole(input: MemberChangeRoleInput) {
    const actor = this.activeMembership(input.teamId, this.userId);
    const team = this.teams.get(input.teamId);
    if (!team || !actor) {
      return { status: "error" as const, code: "NOT_FOUND", message: "Team or membership missing" };
    }
    const target = this.memberships.get(input.membershipId);
    if (!target || target.teamId !== input.teamId || target.endedAt != null) {
      return { status: "error" as const, code: "NOT_FOUND", message: "Member not found" };
    }
    const isSelf = target.userId === this.userId;
    const operation = this.inferRoleOp(actor.role, target.role, input.newRole, isSelf);
    if (!operation) {
      return { status: "error" as const, code: "INVALID", message: "Invalid role change" };
    }
    const allowed = canManageMember({
      actorRole: actor.role,
      targetRole: target.role,
      isSelf,
      operation,
    });
    if (!allowed.allowed) {
      return { status: "error" as const, code: allowed.reason, message: allowed.reason };
    }
    const nextRole = roleAfterOperation(target.role, operation) ?? input.newRole;
    this.memberships.set(target.id, { ...target, role: nextRole });
    this.applyRoleChangeSideEffects(target, nextRole);
    return { status: "ok" as const };
  }

  async removeMember(input: MemberRemoveInput) {
    const actor = this.activeMembership(input.teamId, this.userId);
    const target = this.memberships.get(input.membershipId);
    if (!actor || !target || target.teamId !== input.teamId || target.endedAt != null) {
      return { status: "error" as const, code: "NOT_FOUND", message: "Not found" };
    }
    const allowed = canManageMember({
      actorRole: actor.role,
      targetRole: target.role,
      isSelf: false,
      operation: "remove",
    });
    if (!allowed.allowed) {
      return { status: "error" as const, code: allowed.reason, message: allowed.reason };
    }
    this.endMembership(target, "removed");
    return { status: "ok" as const };
  }

  async leaveTeam(teamId: string) {
    const actor = this.activeMembership(teamId, this.userId);
    const team = this.teams.get(teamId);
    if (!actor || !team) {
      return { status: "error" as const, code: "NOT_FOUND", message: "Not found" };
    }
    const successorOk =
      team.successorMembershipId != null &&
      this.isActiveAdmin(team.successorMembershipId, teamId);
    const allowed = canManageMember({
      actorRole: actor.role,
      targetRole: actor.role,
      isSelf: true,
      operation: "leave",
      hasValidSuccessor: successorOk,
    });
    if (!allowed.allowed) {
      return { status: "error" as const, code: allowed.reason, message: allowed.reason };
    }
    if (actor.role === "owner" && team.successorMembershipId) {
      const successor = this.memberships.get(team.successorMembershipId);
      if (successor) {
        this.memberships.set(successor.id, { ...successor, role: "owner" });
      }
      this.teams.set(teamId, {
        ...team,
        successorMembershipId: null,
        updatedAt: this.now(),
      });
    }
    this.endMembership(actor, "left");
    return { status: "ok" as const };
  }

  async setSuccessor(input: { teamId: string; membershipId: string | null }) {
    const gate = this.requireTeamPermission(input.teamId, "team.successor.manage");
    if (gate.status === "error") return gate;
    if (input.membershipId != null && !this.isActiveAdmin(input.membershipId, input.teamId)) {
      return {
        status: "error" as const,
        code: "SUCCESSOR_MUST_BE_ACTIVE_ADMIN",
        message: "Successor must be an active Admin",
      };
    }
    this.teams.set(input.teamId, {
      ...gate.team,
      successorMembershipId: input.membershipId,
      updatedAt: this.now(),
    });
    return { status: "ok" as const };
  }

  async transferOwnership(input: { teamId: string; membershipId: string }) {
    const gate = this.requireTeamPermission(input.teamId, "team.ownership.transfer");
    if (gate.status === "error") return gate;
    const actor = this.activeMembership(input.teamId, this.userId);
    const target = this.memberships.get(input.membershipId);
    if (!actor || !target || target.endedAt != null || target.role !== "admin") {
      return {
        status: "error" as const,
        code: "INVALID",
        message: "Target must be an active Admin",
      };
    }
    this.memberships.set(actor.id, { ...actor, role: "admin" });
    this.memberships.set(target.id, { ...target, role: "owner" });
    this.teams.set(input.teamId, {
      ...gate.team,
      successorMembershipId: null,
      updatedAt: this.now(),
    });
    return { status: "ok" as const };
  }

  async createInvitation(input: InviteCreateInput) {
    if (!isTeamsFeatureEnabled("invitations")) {
      return {
        status: "error" as const,
        code: "FEATURE_DISABLED",
        message: "Invitations disabled",
      };
    }
    const gate = this.requireTeamPermission(input.teamId, "team.members.invite");
    if (gate.status === "error") return gate;
    const actor = this.activeMembership(input.teamId, this.userId)!;
    if (input.role === "admin" && (actor.role !== "owner" || input.type !== "email")) {
      return {
        status: "error" as const,
        code: "INVALID_ROLE",
        message: "Admin invite only by Owner via email",
      };
    }
    if (input.type === "email" && !input.email?.trim()) {
      return { status: "error" as const, code: "INVALID", message: "Email required" };
    }
    const hours = input.expiresInHours ?? 24 * 7;
    if (hours < 1 || hours > 24 * 30) {
      return { status: "error" as const, code: "INVALID_EXPIRY", message: "Expiry out of range" };
    }
    const maxUses = input.type === "email" ? 1 : Math.min(Math.max(input.maxUses ?? 1, 1), 100);
    const token = this.createId() + this.createId();
    const tokenHash = hashToken(token);
    const now = this.now();
    const id = this.createId();
    const invitation: InviteRecord = {
      id,
      teamId: input.teamId,
      type: input.type,
      email: input.type === "email" ? input.email!.trim().toLowerCase() : null,
      role: input.role,
      status: "pending",
      expiresAt: new Date(Date.parse(now) + hours * 3600_000).toISOString(),
      maxUses,
      usesCount: 0,
      tokenHash,
      createdBy: this.userId,
      revokedAt: null,
      revokeReason: null,
      replacedById: null,
    };
    this.invites.set(id, invitation);
    this.inviteTokens.set(tokenHash, id);
    return { status: "ok" as const, invitation: { ...invitation, token } };
  }

  async acceptInvitation(input: InviteAcceptInput) {
    const tokenHash = hashToken(input.token);
    const id = this.inviteTokens.get(tokenHash);
    const invite = id ? this.invites.get(id) : null;
    if (!invite || invite.status !== "pending") {
      return { status: "error" as const, code: "INVALID_INVITE", message: "Invalid invitation" };
    }
    if (Date.parse(invite.expiresAt) < Date.now()) {
      return { status: "error" as const, code: "INVALID_INVITE", message: "Invalid invitation" };
    }
    const existing = this.activeMembership(invite.teamId, this.userId);
    if (existing) {
      return { status: "error" as const, code: "ALREADY_A_MEMBER", message: "Already a member" };
    }
    if (invite.usesCount >= invite.maxUses) {
      return { status: "error" as const, code: "INVALID_INVITE", message: "Invalid invitation" };
    }
    const now = this.now();
    const membershipId = this.createId();
    const membership: TeamMembership = {
      id: membershipId,
      teamId: invite.teamId,
      userId: this.userId,
      role: invite.role,
      joinedAt: now,
      endedAt: null,
      endReason: null,
    };
    this.memberships.set(membershipId, membership);
    const usesCount = invite.usesCount + 1;
    this.invites.set(invite.id, {
      ...invite,
      usesCount,
      status: usesCount >= invite.maxUses ? "exhausted" : "pending",
    });
    return { status: "ok" as const, teamId: invite.teamId, membershipId };
  }

  async revokeInvitation(input: { teamId: string; invitationId: string }) {
    const gate = this.requireTeamPermission(input.teamId, "team.invitations.manage");
    if (gate.status === "error") return gate;
    const invite = this.invites.get(input.invitationId);
    if (!invite || invite.teamId !== input.teamId) {
      return { status: "error" as const, code: "NOT_FOUND", message: "Not found" };
    }
    this.invites.set(invite.id, {
      ...invite,
      status: "revoked",
      revokedAt: this.now(),
      revokeReason: "manual",
    });
    return { status: "ok" as const };
  }

  async resendInvitation(input: { teamId: string; invitationId: string }) {
    const old = this.invites.get(input.invitationId);
    if (!old || old.teamId !== input.teamId) {
      return { status: "error" as const, code: "NOT_FOUND", message: "Not found" };
    }
    await this.revokeInvitation({
      teamId: input.teamId,
      invitationId: input.invitationId,
    });
    const created = await this.createInvitation({
      teamId: input.teamId,
      type: old.type,
      email: old.email ?? undefined,
      role: old.role,
      maxUses: old.maxUses,
    });
    if (created.status === "ok") {
      this.invites.set(old.id, {
        ...this.invites.get(old.id)!,
        replacedById: created.invitation.id,
        revokeReason: "replaced",
      });
    }
    return created;
  }

  async createTeamProject(input: { teamId: string; name: string }) {
    const gate = this.requireTeamPermission(input.teamId, "team.projects.create");
    if (gate.status === "error") return gate;
    const now = this.now();
    const project: TeamProject = {
      id: this.createId(),
      teamId: input.teamId,
      name: input.name.trim(),
      settings: {},
      sourceProjectId: null,
      createdBy: this.userId,
      createdAt: now,
      updatedAt: now,
    };
    this.projects.set(project.id, project);
    return { status: "ok" as const, project };
  }

  async deleteTeamProject(input: { teamId: string; projectId: string }) {
    const gate = this.requireTeamPermission(input.teamId, "team.projects.delete");
    if (gate.status === "error") return gate;
    this.projects.delete(input.projectId);
    return { status: "ok" as const };
  }

  async listTeamProjects(teamId: string) {
    const gate = this.requireTeamPermission(teamId, "team.view");
    if (gate.status === "error") return gate;
    const actor = this.activeMembership(teamId, this.userId)!;
    const projects = [...this.projects.values()].filter((p) => {
      if (p.teamId !== teamId) return false;
      if (actor.role === "owner" || actor.role === "admin") return true;
      return [...this.projectMembers.values()].some(
        (pm) =>
          pm.projectId === p.id &&
          pm.teamMembershipId === actor.id &&
          pm.endedAt == null,
      );
    });
    return { status: "ok" as const, projects };
  }

  async setProjectMember(input: {
    teamId: string;
    projectId: string;
    teamMembershipId: string;
    role: ProjectRole;
  }) {
    const actor = this.activeMembership(input.teamId, this.userId);
    if (!actor) {
      return { status: "error" as const, code: "NOT_FOUND", message: "Not a member" };
    }
    const target = this.memberships.get(input.teamMembershipId);
    if (!target || target.teamId !== input.teamId || target.endedAt != null) {
      return { status: "error" as const, code: "NOT_FOUND", message: "Target not found" };
    }
    if (target.role === "owner" || target.role === "admin") {
      return {
        status: "error" as const,
        code: "NO_EXPLICIT_MEMBERSHIP_FOR_ADMINS",
        message: "Owner/Admin use Implicit Access",
      };
    }
    if (!projectRoleWithinCeiling(target.role, input.role)) {
      return {
        status: "error" as const,
        code: "ROLE_EXCEEDS_CEILING",
        message: "Role exceeds ceiling",
      };
    }
    const canManage =
      actor.role === "owner" ||
      actor.role === "admin" ||
      [...this.projectMembers.values()].some(
        (pm) =>
          pm.projectId === input.projectId &&
          pm.teamMembershipId === actor.id &&
          pm.endedAt == null &&
          pm.role === "project_admin",
      );
    if (!canManage) {
      return { status: "error" as const, code: "permission_denied", message: "Denied" };
    }
    const existing = [...this.projectMembers.values()].find(
      (pm) =>
        pm.projectId === input.projectId &&
        pm.teamMembershipId === input.teamMembershipId &&
        pm.endedAt == null,
    );
    if (existing) {
      this.projectMembers.set(existing.id, { ...existing, role: input.role });
    } else {
      const id = this.createId();
      this.projectMembers.set(id, {
        id,
        projectId: input.projectId,
        teamId: input.teamId,
        teamMembershipId: input.teamMembershipId,
        role: input.role,
        startedAt: this.now(),
        endedAt: null,
        endReason: null,
      });
    }
    return { status: "ok" as const };
  }

  async listProjectMembers(input: { teamId: string; projectId: string }) {
    const members = [];
    for (const m of this.memberships.values()) {
      if (m.teamId !== input.teamId || m.endedAt != null) continue;
      if (m.role === "owner" || m.role === "admin") {
        members.push({
          kind: "implicit" as const,
          userId: m.userId,
          role: "implicit_admin" as const,
        });
      }
    }
    for (const pm of this.projectMembers.values()) {
      if (pm.projectId !== input.projectId || pm.endedAt != null) continue;
      const tm = this.memberships.get(pm.teamMembershipId);
      if (!tm) continue;
      members.push({
        kind: "explicit" as const,
        membershipId: pm.id,
        userId: tm.userId,
        role: pm.role,
      });
    }
    return { status: "ok" as const, members };
  }

  async upsertTeamContent(input: {
    teamId: string;
    projectId: string;
    kind: "collection" | "request" | "environment" | "variable" | "execution";
    payload: Record<string, unknown>;
  }) {
    const id = (input.payload.id as string) || this.createId();
    const stored: Record<string, unknown> = { ...input.payload, id };
    if (input.kind === "variable" && stored.isSecret === true) {
      stored.value = null;
      if (typeof input.payload.secretValue === "string") {
        stored.secretCiphertext = `[enc:${input.payload.secretValue}]`;
      }
      delete stored.secretValue;
    }
    if (input.kind === "execution") {
      stored.requestLog = maskSecrets(stored.requestLog);
      stored.responseLog = maskSecrets(stored.responseLog);
    }
    this.content.set(`${input.kind}:${id}`, stored);
    return { status: "ok" as const, id };
  }

  async clonePersonalToTeam(input: ClonePersonalToTeamInput) {
    if (!isTeamsFeatureEnabled("clone")) {
      return { status: "error" as const, code: "FEATURE_DISABLED", message: "Clone disabled" };
    }
    const gate = this.requireTeamPermission(input.teamId, "team.projects.create");
    if (gate.status === "error") return gate;
    const requestCount = input.collections.reduce((n, c) => n + c.requests.length, 0);
    if (requestCount > 5000) {
      return { status: "error" as const, code: "TOO_LARGE", message: "Project too large to clone" };
    }
    const cleared: string[] = [];
    const now = this.now();
    const project: TeamProject = {
      id: this.createId(),
      teamId: input.teamId,
      name: input.name.trim(),
      settings: {},
      sourceProjectId: input.sourceProjectId,
      createdBy: this.userId,
      createdAt: now,
      updatedAt: now,
    };
    this.projects.set(project.id, project);
    for (const collection of input.collections) {
      const collectionId = this.createId();
      this.content.set(`collection:${collectionId}`, {
        id: collectionId,
        projectId: project.id,
        name: collection.name,
      });
      for (const request of collection.requests) {
        const config = sanitizeConfig(request.config, cleared);
        const requestId = this.createId();
        this.content.set(`request:${requestId}`, {
          id: requestId,
          projectId: project.id,
          collectionId,
          name: request.name,
          method: request.method,
          url: request.url,
          config,
        });
      }
    }
    for (const env of input.environments ?? []) {
      const envId = this.createId();
      this.content.set(`environment:${envId}`, {
        id: envId,
        projectId: project.id,
        name: env.name,
      });
      for (const variable of env.variables) {
        const varId = this.createId();
        this.content.set(`variable:${varId}`, {
          id: varId,
          environmentId: envId,
          key: variable.key,
          isSecret: variable.isSecret,
          value: variable.isSecret ? null : variable.value,
          secretCiphertext: variable.isSecret ? null : undefined,
        });
        if (variable.isSecret) cleared.push(`secret:${variable.key}`);
      }
    }
    return { status: "ok" as const, project, cleared };
  }

  async softDeleteTeam(teamId: string) {
    const gate = this.requireTeamPermission(teamId, "team.delete");
    if (gate.status === "error") return gate;
    const deletedAt = this.now();
    const purgeAfter = new Date(Date.parse(deletedAt) + 30 * 86400_000).toISOString();
    this.teams.set(teamId, {
      ...gate.team,
      status: "deleted",
      deletedAt,
      purgeAfter,
      updatedAt: deletedAt,
    });
    for (const invite of this.invites.values()) {
      if (invite.teamId === teamId && invite.status === "pending") {
        this.invites.set(invite.id, {
          ...invite,
          status: "revoked",
          revokedAt: deletedAt,
          revokeReason: "team_deleted",
        });
      }
    }
    return { status: "ok" as const };
  }

  async restoreTeam(teamId: string) {
    const team = this.teams.get(teamId);
    const actor = this.activeMembership(teamId, this.userId);
    if (!team || !actor || actor.role !== "owner") {
      return { status: "error" as const, code: "permission_denied", message: "Owner only" };
    }
    if (team.status !== "deleted") {
      return { status: "error" as const, code: "INVALID", message: "Team not soft-deleted" };
    }
    this.teams.set(teamId, {
      ...team,
      status: "active",
      deletedAt: null,
      purgeAfter: null,
      updatedAt: this.now(),
    });
    return { status: "ok" as const };
  }

  /** Test helper: run purge for soft-deleted teams past purgeAfter */
  purgeDueTeams(nowIso = this.now()): string[] {
    const purged: string[] = [];
    for (const team of [...this.teams.values()]) {
      if (team.status !== "deleted" || !team.purgeAfter) continue;
      if (Date.parse(team.purgeAfter) > Date.parse(nowIso)) continue;
      this.teams.set(team.id, { ...team, status: "deleting" });
      for (const [id, m] of this.memberships) {
        if (m.teamId === team.id) this.memberships.delete(id);
      }
      for (const [id, p] of this.projects) {
        if (p.teamId === team.id) this.projects.delete(id);
      }
      this.teams.delete(team.id);
      this.slugs.delete(team.slug);
      purged.push(team.id);
    }
    return purged;
  }

  private requireTeamPermission(
    teamId: string,
    permission: Parameters<typeof authorizeTeam>[0]["permission"],
  ) {
    const team = this.teams.get(teamId);
    const membership = this.activeMembership(teamId, this.userId);
    if (!team) {
      return { status: "error" as const, code: "NOT_FOUND", message: "Team not found" };
    }
    const auth = authorizeTeam({ team, membership, permission });
    if (!auth.allowed) {
      return { status: "error" as const, code: auth.reason, message: auth.reason };
    }
    return { status: "ok" as const, team, membership: membership! };
  }

  private activeMembership(teamId: string, userId: string): TeamMembership | null {
    for (const m of this.memberships.values()) {
      if (m.teamId === teamId && m.userId === userId && m.endedAt == null) return m;
    }
    return null;
  }

  private isActiveAdmin(membershipId: string, teamId: string): boolean {
    const m = this.memberships.get(membershipId);
    return !!m && m.teamId === teamId && m.endedAt == null && m.role === "admin";
  }

  private endMembership(target: TeamMembership, reason: string): void {
    const endedAt = this.now();
    this.memberships.set(target.id, {
      ...target,
      endedAt,
      endReason: reason,
    });
    for (const pm of this.projectMembers.values()) {
      if (pm.teamMembershipId === target.id && pm.endedAt == null) {
        this.projectMembers.set(pm.id, {
          ...pm,
          endedAt,
          endReason: "team_membership_ended",
        });
      }
    }
    const team = this.teams.get(target.teamId);
    if (team?.successorMembershipId === target.id) {
      this.teams.set(team.id, {
        ...team,
        successorMembershipId: null,
        updatedAt: endedAt,
      });
    }
    for (const invite of this.invites.values()) {
      if (
        invite.createdBy === target.userId &&
        invite.teamId === target.teamId &&
        invite.status === "pending"
      ) {
        this.invites.set(invite.id, {
          ...invite,
          status: "revoked",
          revokedAt: endedAt,
          revokeReason: "inviter_lost_permission",
        });
      }
    }
  }

  private applyRoleChangeSideEffects(
    target: TeamMembership,
    nextRole: TeamRole,
  ): void {
    const now = this.now();
    if (nextRole === "owner" || nextRole === "admin") {
      for (const pm of this.projectMembers.values()) {
        if (pm.teamMembershipId === target.id && pm.endedAt == null) {
          this.projectMembers.set(pm.id, {
            ...pm,
            endedAt: now,
            endReason: "promoted_to_admin",
          });
        }
      }
    }
    if (nextRole === "viewer") {
      for (const pm of this.projectMembers.values()) {
        if (
          pm.teamMembershipId === target.id &&
          pm.endedAt == null &&
          pm.role !== "project_viewer"
        ) {
          this.projectMembers.set(pm.id, { ...pm, role: "project_viewer" });
        }
      }
    }
    if (nextRole !== "admin") {
      const team = this.teams.get(target.teamId);
      if (team?.successorMembershipId === target.id) {
        this.teams.set(team.id, {
          ...team,
          successorMembershipId: null,
          updatedAt: now,
        });
      }
    }
  }

  private inferRoleOp(
    _actor: TeamRole,
    current: TeamRole,
    next: Exclude<TeamRole, "owner">,
    isSelf: boolean,
  ) {
    if (isSelf && current === "admin") {
      if (next === "editor") return "self_demote_to_editor" as const;
      if (next === "viewer") return "self_demote_to_viewer" as const;
    }
    if (next === "admin") return "promote_to_admin" as const;
    if (current === "admin" && (next === "editor" || next === "viewer")) {
      return next === "editor" ? ("demote_to_editor" as const) : ("demote_to_viewer" as const);
    }
    if (
      (current === "editor" || current === "viewer") &&
      (next === "editor" || next === "viewer") &&
      current !== next
    ) {
      return "switch_editor_viewer" as const;
    }
    if (current !== next && (next === "editor" || next === "viewer")) {
      return next === "editor" ? ("demote_to_editor" as const) : ("demote_to_viewer" as const);
    }
    return null;
  }
}

function sanitizeConfig(
  config: Record<string, unknown>,
  cleared: string[],
): Record<string, unknown> {
  const next = structuredClone(config);
  const auth = next.auth as Record<string, unknown> | undefined;
  if (auth) {
    for (const key of ["token", "apiKey", "password", "username"]) {
      if (auth[key]) {
        auth[key] = "";
        cleared.push(`auth.${key}`);
      }
    }
  }
  const headers = next.headers as Array<{ key?: string; value?: string }> | undefined;
  if (Array.isArray(headers)) {
    for (const h of headers) {
      if (h.key && SENSITIVE_HEADERS.has(h.key.toLowerCase()) && h.value) {
        h.value = "";
        cleared.push(`header.${h.key}`);
      }
    }
  }
  return next;
}

function maskSecrets(value: unknown): unknown {
  if (value == null) return value;
  const json = JSON.stringify(value);
  return JSON.parse(json.replace(/"(Bearer\s+)[^"]+"/gi, '"$1••••"'));
}
