import * as admin from "firebase-admin";
import { createHash, randomBytes } from "node:crypto";
import {
  authorizeTeam,
  canManageMember,
  projectRoleWithinCeiling,
  roleAfterOperation,
} from "./policy";
import type { TeamMembership, TeamRecord, TeamRole } from "./policy/team.types";
import {
  auditPath,
  invitationPath,
  invitationsPath,
  membershipPath,
  membershipsPath,
  projectMembersPath,
  projectPath,
  projectsPath,
  teamIndexPath,
  teamPath,
} from "./firestore-paths";

const db = () => admin.firestore();

function slugify(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "team"
  );
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export class TeamOps {
  constructor(private readonly uid: string) {}

  async ping() {
    return { ok: true as const };
  }

  async createTeam(input: { name: string; slug?: string }) {
    const name = (input.name ?? "").trim();
    if (!name) return err("INVALID", "Name required");
    const now = new Date().toISOString();
    const teamRef = db().collection("teams").doc();
    const membershipRef = teamRef.collection("memberships").doc();
    let slug = (input.slug?.trim() || slugify(name)).toLowerCase();
    const slugSnap = await db()
      .collection("teams")
      .where("slug", "==", slug)
      .limit(1)
      .get();
    if (!slugSnap.empty) slug = `${slug}-${teamRef.id.slice(0, 6)}`;

    const team: TeamRecord = {
      id: teamRef.id,
      name,
      slug,
      status: "active",
      successorMembershipId: null,
      createdBy: this.uid,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      purgeAfter: null,
    };
    const membership: TeamMembership = {
      id: membershipRef.id,
      teamId: teamRef.id,
      userId: this.uid,
      role: "owner",
      joinedAt: now,
      endedAt: null,
      endReason: null,
    };

    const batch = db().batch();
    batch.set(teamRef, team);
    batch.set(membershipRef, membership);
    batch.set(db().doc(teamIndexPath(this.uid, teamRef.id)), {
      teamId: teamRef.id,
      membershipId: membershipRef.id,
      role: "owner",
      updatedAt: now,
    });
    batch.set(db().doc(auditPath(teamRef.id, randomBytes(8).toString("hex"))), {
      action: "team.created",
      actorUserId: this.uid,
      createdAt: now,
    });
    await batch.commit();
    return { status: "ok" as const, team };
  }

  async updateTeam(input: { teamId: string; name: string }) {
    const ctx = await this.loadActive(input.teamId);
    if ("status" in ctx) return ctx;
    const auth = authorizeTeam({
      team: ctx.team,
      membership: ctx.membership,
      permission: "team.update",
    });
    if (!auth.allowed) return err(auth.reason, auth.reason);
    const name = input.name.trim();
    if (!name) return err("INVALID", "Name required");
    const team = { ...ctx.team, name, updatedAt: new Date().toISOString() };
    await db().doc(teamPath(input.teamId)).set(team);
    return { status: "ok" as const, team };
  }

  async listMine() {
    const index = await db().collection(`users/${this.uid}/teamIndex`).get();
    const teams: Array<{ team: TeamRecord; membership: TeamMembership }> = [];
    for (const doc of index.docs) {
      const teamId = doc.id;
      const teamSnap = await db().doc(teamPath(teamId)).get();
      if (!teamSnap.exists) continue;
      const team = teamSnap.data() as TeamRecord;
      if (team.status !== "active") continue;
      const membershipId = doc.data().membershipId as string;
      const mSnap = await db().doc(membershipPath(teamId, membershipId)).get();
      if (!mSnap.exists) continue;
      const membership = mSnap.data() as TeamMembership;
      if (membership.endedAt != null) continue;
      teams.push({ team, membership });
    }
    return { status: "ok" as const, teams };
  }

  async listMembers(teamId: string) {
    const ctx = await this.loadActive(teamId);
    if ("status" in ctx) return ctx;
    const auth = authorizeTeam({
      team: ctx.team,
      membership: ctx.membership,
      permission: "team.members.view",
    });
    if (!auth.allowed) return err(auth.reason, auth.reason);
    const snap = await db().collection(membershipsPath(teamId)).get();
    const members = snap.docs
      .map((d) => d.data() as TeamMembership)
      .filter((m) => m.endedAt == null);
    return { status: "ok" as const, members };
  }

  async changeMemberRole(input: {
    teamId: string;
    membershipId: string;
    newRole: Exclude<TeamRole, "owner">;
  }) {
    const ctx = await this.loadActive(input.teamId);
    if ("status" in ctx) return ctx;
    const targetSnap = await db()
      .doc(membershipPath(input.teamId, input.membershipId))
      .get();
    if (!targetSnap.exists) return err("NOT_FOUND", "Member not found");
    const target = targetSnap.data() as TeamMembership;
    if (target.endedAt != null) return err("NOT_FOUND", "Member not found");
    const isSelf = target.userId === this.uid;
    const operation = inferRoleOp(target.role, input.newRole, isSelf);
    if (!operation) return err("INVALID", "Invalid role change");
    const allowed = canManageMember({
      actorRole: ctx.membership.role,
      targetRole: target.role,
      isSelf,
      operation,
    });
    if (!allowed.allowed) return err(allowed.reason, allowed.reason);
    const nextRole = roleAfterOperation(target.role, operation) ?? input.newRole;
    await db()
      .doc(membershipPath(input.teamId, input.membershipId))
      .update({ role: nextRole });
    await db().doc(teamIndexPath(target.userId, input.teamId)).set(
      {
        teamId: input.teamId,
        membershipId: target.id,
        role: nextRole,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
    return { status: "ok" as const };
  }

  async removeMember(input: { teamId: string; membershipId: string }) {
    const ctx = await this.loadActive(input.teamId);
    if ("status" in ctx) return ctx;
    const targetSnap = await db()
      .doc(membershipPath(input.teamId, input.membershipId))
      .get();
    if (!targetSnap.exists) return err("NOT_FOUND", "Not found");
    const target = targetSnap.data() as TeamMembership;
    const allowed = canManageMember({
      actorRole: ctx.membership.role,
      targetRole: target.role,
      isSelf: false,
      operation: "remove",
    });
    if (!allowed.allowed) return err(allowed.reason, allowed.reason);
    await this.endMembership(target, "removed");
    return { status: "ok" as const };
  }

  async leaveTeam(teamId: string) {
    const ctx = await this.loadActive(teamId);
    if ("status" in ctx) return ctx;
    const successorOk =
      ctx.team.successorMembershipId != null &&
      (await this.isActiveAdmin(teamId, ctx.team.successorMembershipId));
    const allowed = canManageMember({
      actorRole: ctx.membership.role,
      targetRole: ctx.membership.role,
      isSelf: true,
      operation: "leave",
      hasValidSuccessor: successorOk,
    });
    if (!allowed.allowed) return err(allowed.reason, allowed.reason);
    if (ctx.membership.role === "owner" && ctx.team.successorMembershipId) {
      await db()
        .doc(membershipPath(teamId, ctx.team.successorMembershipId))
        .update({ role: "owner" });
      await db().doc(teamPath(teamId)).update({
        successorMembershipId: null,
        updatedAt: new Date().toISOString(),
      });
    }
    await this.endMembership(ctx.membership, "left");
    return { status: "ok" as const };
  }

  async setSuccessor(input: { teamId: string; membershipId: string | null }) {
    const ctx = await this.loadActive(input.teamId);
    if ("status" in ctx) return ctx;
    const auth = authorizeTeam({
      team: ctx.team,
      membership: ctx.membership,
      permission: "team.successor.manage",
    });
    if (!auth.allowed) return err(auth.reason, auth.reason);
    if (
      input.membershipId != null &&
      !(await this.isActiveAdmin(input.teamId, input.membershipId))
    ) {
      return err("SUCCESSOR_MUST_BE_ACTIVE_ADMIN", "Successor must be active Admin");
    }
    await db().doc(teamPath(input.teamId)).update({
      successorMembershipId: input.membershipId,
      updatedAt: new Date().toISOString(),
    });
    return { status: "ok" as const };
  }

  async transferOwnership(input: { teamId: string; membershipId: string }) {
    const ctx = await this.loadActive(input.teamId);
    if ("status" in ctx) return ctx;
    const auth = authorizeTeam({
      team: ctx.team,
      membership: ctx.membership,
      permission: "team.ownership.transfer",
    });
    if (!auth.allowed) return err(auth.reason, auth.reason);
    if (!(await this.isActiveAdmin(input.teamId, input.membershipId))) {
      return err("INVALID", "Target must be an active Admin");
    }
    const batch = db().batch();
    batch.update(db().doc(membershipPath(input.teamId, ctx.membership.id)), {
      role: "admin",
    });
    batch.update(db().doc(membershipPath(input.teamId, input.membershipId)), {
      role: "owner",
    });
    batch.update(db().doc(teamPath(input.teamId)), {
      successorMembershipId: null,
      updatedAt: new Date().toISOString(),
    });
    await batch.commit();
    return { status: "ok" as const };
  }

  async createInvitation(input: {
    teamId: string;
    type: "email" | "link";
    email?: string;
    role: "admin" | "editor" | "viewer";
    maxUses?: number;
    expiresInHours?: number;
  }) {
    const ctx = await this.loadActive(input.teamId);
    if ("status" in ctx) return ctx;
    const auth = authorizeTeam({
      team: ctx.team,
      membership: ctx.membership,
      permission: "team.members.invite",
    });
    if (!auth.allowed) return err(auth.reason, auth.reason);
    if (
      input.role === "admin" &&
      (ctx.membership.role !== "owner" || input.type !== "email")
    ) {
      return err("INVALID_ROLE", "Admin invite only by Owner via email");
    }
    const hours = input.expiresInHours ?? 24 * 7;
    if (hours < 1 || hours > 24 * 30) return err("INVALID_EXPIRY", "Expiry out of range");
    const maxUses =
      input.type === "email" ? 1 : Math.min(Math.max(input.maxUses ?? 1, 1), 100);
    const token = randomBytes(32).toString("hex");
    const inviteRef = db().collection(invitationsPath(input.teamId)).doc();
    const now = new Date().toISOString();
    const invitation = {
      id: inviteRef.id,
      teamId: input.teamId,
      type: input.type,
      email: input.type === "email" ? (input.email ?? "").trim().toLowerCase() : null,
      role: input.role,
      status: "pending",
      expiresAt: new Date(Date.now() + hours * 3600_000).toISOString(),
      maxUses,
      usesCount: 0,
      tokenHash: tokenHash(token),
      createdBy: this.uid,
      createdAt: now,
      revokedAt: null,
      revokeReason: null,
      replacedById: null,
    };
    if (input.type === "email" && !invitation.email) {
      return err("INVALID", "Email required");
    }
    await inviteRef.set(invitation);
    return { status: "ok" as const, invitation: { ...invitation, token } };
  }

  async acceptInvitation(input: { token: string }) {
    const hash = tokenHash(input.token);
    const q = await db()
      .collectionGroup("invitations")
      .where("tokenHash", "==", hash)
      .where("status", "==", "pending")
      .limit(1)
      .get();
    if (q.empty) return err("INVALID_INVITE", "Invalid invitation");
    const invite = q.docs[0].data();
    if (Date.parse(invite.expiresAt) < Date.now()) {
      return err("INVALID_INVITE", "Invalid invitation");
    }
    const existing = await this.findActiveMembership(invite.teamId, this.uid);
    if (existing) return err("ALREADY_A_MEMBER", "Already a member");
    if (invite.usesCount >= invite.maxUses) {
      return err("INVALID_INVITE", "Invalid invitation");
    }
    if (invite.type === "email" && invite.email) {
      const user = await admin.auth().getUser(this.uid);
      if (!user.emailVerified || user.email?.toLowerCase() !== invite.email) {
        return err("EMAIL_MISMATCH", "Email does not match invitation");
      }
    }
    const now = new Date().toISOString();
    const membershipRef = db().collection(membershipsPath(invite.teamId)).doc();
    const usesCount = invite.usesCount + 1;
    const batch = db().batch();
    batch.set(membershipRef, {
      id: membershipRef.id,
      teamId: invite.teamId,
      userId: this.uid,
      role: invite.role,
      joinedAt: now,
      endedAt: null,
      endReason: null,
    });
    batch.update(q.docs[0].ref, {
      usesCount,
      status: usesCount >= invite.maxUses ? "exhausted" : "pending",
    });
    batch.set(db().doc(teamIndexPath(this.uid, invite.teamId)), {
      teamId: invite.teamId,
      membershipId: membershipRef.id,
      role: invite.role,
      updatedAt: now,
    });
    await batch.commit();
    return {
      status: "ok" as const,
      teamId: invite.teamId as string,
      membershipId: membershipRef.id,
    };
  }

  async revokeInvitation(input: { teamId: string; invitationId: string }) {
    const ctx = await this.loadActive(input.teamId);
    if ("status" in ctx) return ctx;
    const auth = authorizeTeam({
      team: ctx.team,
      membership: ctx.membership,
      permission: "team.invitations.manage",
    });
    if (!auth.allowed) return err(auth.reason, auth.reason);
    await db().doc(invitationPath(input.teamId, input.invitationId)).update({
      status: "revoked",
      revokedAt: new Date().toISOString(),
      revokeReason: "manual",
    });
    return { status: "ok" as const };
  }

  async resendInvitation(input: { teamId: string; invitationId: string }) {
    const snap = await db()
      .doc(invitationPath(input.teamId, input.invitationId))
      .get();
    if (!snap.exists) return err("NOT_FOUND", "Not found");
    const old = snap.data()!;
    await this.revokeInvitation(input);
    await snap.ref.update({ revokeReason: "replaced" });
    const created = await this.createInvitation({
      teamId: input.teamId,
      type: old.type,
      email: old.email ?? undefined,
      role: old.role,
      maxUses: old.maxUses,
    });
    if (created.status === "ok") {
      await snap.ref.update({ replacedById: created.invitation.id });
    }
    return created;
  }

  async createProject(input: { teamId: string; name: string }) {
    const ctx = await this.loadActive(input.teamId);
    if ("status" in ctx) return ctx;
    const auth = authorizeTeam({
      team: ctx.team,
      membership: ctx.membership,
      permission: "team.projects.create",
    });
    if (!auth.allowed) return err(auth.reason, auth.reason);
    const now = new Date().toISOString();
    const ref = db().collection(projectsPath(input.teamId)).doc();
    const project = {
      id: ref.id,
      teamId: input.teamId,
      name: input.name.trim(),
      settings: {},
      sourceProjectId: null,
      createdBy: this.uid,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(project);
    return { status: "ok" as const, project };
  }

  async deleteProject(input: { teamId: string; projectId: string }) {
    const ctx = await this.loadActive(input.teamId);
    if ("status" in ctx) return ctx;
    const auth = authorizeTeam({
      team: ctx.team,
      membership: ctx.membership,
      permission: "team.projects.delete",
    });
    if (!auth.allowed) return err(auth.reason, auth.reason);
    await db().doc(projectPath(input.teamId, input.projectId)).delete();
    return { status: "ok" as const };
  }

  async listProjects(teamId: string) {
    const ctx = await this.loadActive(teamId);
    if ("status" in ctx) return ctx;
    const snap = await db().collection(projectsPath(teamId)).get();
    let projects = snap.docs.map((d) => d.data());
    if (ctx.membership.role !== "owner" && ctx.membership.role !== "admin") {
      const allowed = new Set<string>();
      for (const p of projects) {
        const members = await db()
          .collection(projectMembersPath(teamId, p.id))
          .where("teamMembershipId", "==", ctx.membership.id)
          .where("endedAt", "==", null)
          .limit(1)
          .get();
        if (!members.empty) allowed.add(p.id);
      }
      projects = projects.filter((p) => allowed.has(p.id));
    }
    return { status: "ok" as const, projects };
  }

  async setProjectMember(input: {
    teamId: string;
    projectId: string;
    teamMembershipId: string;
    role: "project_admin" | "project_editor" | "project_viewer";
  }) {
    const ctx = await this.loadActive(input.teamId);
    if ("status" in ctx) return ctx;
    const targetSnap = await db()
      .doc(membershipPath(input.teamId, input.teamMembershipId))
      .get();
    if (!targetSnap.exists) return err("NOT_FOUND", "Target not found");
    const target = targetSnap.data() as TeamMembership;
    if (target.endedAt != null) return err("NOT_FOUND", "Target not found");
    if (target.role === "owner" || target.role === "admin") {
      return err("NO_EXPLICIT_MEMBERSHIP_FOR_ADMINS", "Owner/Admin use Implicit Access");
    }
    if (!projectRoleWithinCeiling(target.role, input.role)) {
      return err("ROLE_EXCEEDS_CEILING", "Role exceeds ceiling");
    }
    const ref = db().collection(projectMembersPath(input.teamId, input.projectId)).doc();
    await ref.set({
      id: ref.id,
      projectId: input.projectId,
      teamId: input.teamId,
      teamMembershipId: input.teamMembershipId,
      role: input.role,
      startedAt: new Date().toISOString(),
      endedAt: null,
      endReason: null,
    });
    return { status: "ok" as const };
  }

  async listProjectMembers(input: { teamId: string; projectId: string }) {
    const membersSnap = await db().collection(membershipsPath(input.teamId)).get();
    const members = [];
    for (const d of membersSnap.docs) {
      const m = d.data() as TeamMembership;
      if (m.endedAt != null) continue;
      if (m.role === "owner" || m.role === "admin") {
        members.push({
          kind: "implicit" as const,
          userId: m.userId,
          role: "implicit_admin" as const,
        });
      }
    }
    const pm = await db()
      .collection(projectMembersPath(input.teamId, input.projectId))
      .get();
    for (const d of pm.docs) {
      const row = d.data();
      if (row.endedAt != null) continue;
      const tm = membersSnap.docs.find((x) => x.id === row.teamMembershipId)?.data() as
        | TeamMembership
        | undefined;
      if (!tm) continue;
      members.push({
        kind: "explicit" as const,
        membershipId: row.id,
        userId: tm.userId,
        role: row.role,
      });
    }
    return { status: "ok" as const, members };
  }

  async upsertContent(input: {
    teamId: string;
    projectId: string;
    kind: string;
    payload: Record<string, unknown>;
  }) {
    const ctx = await this.loadActive(input.teamId);
    if ("status" in ctx) return ctx;
    const id = (input.payload.id as string) || db().collection("_").doc().id;
    const stored: Record<string, unknown> = { ...input.payload, id };
    if (input.kind === "variable" && stored.isSecret === true) {
      stored.value = null;
      if (typeof input.payload.secretValue === "string") {
        stored.secretCiphertext = Buffer.from(
          String(input.payload.secretValue),
        ).toString("base64");
      }
      delete stored.secretValue;
    }
    if (input.kind === "execution") {
      stored.requestLog = mask(stored.requestLog);
      stored.responseLog = mask(stored.responseLog);
      stored.executedBy = this.uid;
    }
    await db()
      .doc(`teams/${input.teamId}/projects/${input.projectId}/${input.kind}/${id}`)
      .set(stored);
    return { status: "ok" as const, id };
  }

  async clonePersonal(input: {
    teamId: string;
    sourceProjectId: string;
    name: string;
    collections: Array<{
      name: string;
      requests: Array<{
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
  }) {
    const created = await this.createProject({
      teamId: input.teamId,
      name: input.name,
    });
    if (created.status !== "ok") return created;
    const cleared: string[] = [];
    const projectId = created.project.id;
    await db().doc(projectPath(input.teamId, projectId)).update({
      sourceProjectId: input.sourceProjectId,
    });
    for (const collection of input.collections) {
      const c = await this.upsertContent({
        teamId: input.teamId,
        projectId,
        kind: "collections",
        payload: { name: collection.name },
      });
      if (c.status !== "ok") continue;
      for (const request of collection.requests) {
        const config = sanitize(request.config, cleared);
        await this.upsertContent({
          teamId: input.teamId,
          projectId,
          kind: "requests",
          payload: {
            collectionId: c.id,
            name: request.name,
            method: request.method,
            url: request.url,
            config,
          },
        });
      }
    }
    for (const env of input.environments ?? []) {
      const e = await this.upsertContent({
        teamId: input.teamId,
        projectId,
        kind: "environments",
        payload: { name: env.name },
      });
      if (e.status !== "ok") continue;
      for (const variable of env.variables) {
        await this.upsertContent({
          teamId: input.teamId,
          projectId,
          kind: "variables",
          payload: {
            environmentId: e.id,
            key: variable.key,
            isSecret: variable.isSecret,
            value: variable.isSecret ? null : variable.value,
            secretValue: variable.isSecret ? undefined : undefined,
          },
        });
        if (variable.isSecret) cleared.push(`secret:${variable.key}`);
      }
    }
    return {
      status: "ok" as const,
      project: { ...created.project, sourceProjectId: input.sourceProjectId },
      cleared,
    };
  }

  async softDelete(teamId: string) {
    const ctx = await this.loadActive(teamId);
    if ("status" in ctx) return ctx;
    const auth = authorizeTeam({
      team: ctx.team,
      membership: ctx.membership,
      permission: "team.delete",
    });
    if (!auth.allowed) return err(auth.reason, auth.reason);
    const deletedAt = new Date().toISOString();
    const purgeAfter = new Date(Date.now() + 30 * 86400_000).toISOString();
    await db().doc(teamPath(teamId)).update({
      status: "deleted",
      deletedAt,
      purgeAfter,
      updatedAt: deletedAt,
    });
    const invites = await db()
      .collection(invitationsPath(teamId))
      .where("status", "==", "pending")
      .get();
    const batch = db().batch();
    for (const d of invites.docs) {
      batch.update(d.ref, {
        status: "revoked",
        revokedAt: deletedAt,
        revokeReason: "team_deleted",
      });
    }
    await batch.commit();
    return { status: "ok" as const };
  }

  async restore(teamId: string) {
    const teamSnap = await db().doc(teamPath(teamId)).get();
    if (!teamSnap.exists) return err("NOT_FOUND", "Not found");
    const team = teamSnap.data() as TeamRecord;
    const membership = await this.findActiveMembership(teamId, this.uid);
    if (!membership || membership.role !== "owner") {
      return err("permission_denied", "Owner only");
    }
    if (team.status !== "deleted") return err("INVALID", "Team not soft-deleted");
    await teamSnap.ref.update({
      status: "active",
      deletedAt: null,
      purgeAfter: null,
      updatedAt: new Date().toISOString(),
    });
    return { status: "ok" as const };
  }

  private async loadActive(teamId: string) {
    const teamSnap = await db().doc(teamPath(teamId)).get();
    if (!teamSnap.exists) return err("NOT_FOUND", "Team not found");
    const team = teamSnap.data() as TeamRecord;
    const membership = await this.findActiveMembership(teamId, this.uid);
    if (!membership) return err("not_a_member", "Not a member");
    return { team, membership };
  }

  private async findActiveMembership(
    teamId: string,
    userId: string,
  ): Promise<TeamMembership | null> {
    const snap = await db()
      .collection(membershipsPath(teamId))
      .where("userId", "==", userId)
      .where("endedAt", "==", null)
      .limit(1)
      .get();
    if (snap.empty) return null;
    return snap.docs[0].data() as TeamMembership;
  }

  private async isActiveAdmin(teamId: string, membershipId: string) {
    const snap = await db().doc(membershipPath(teamId, membershipId)).get();
    if (!snap.exists) return false;
    const m = snap.data() as TeamMembership;
    return m.endedAt == null && m.role === "admin";
  }

  private async endMembership(target: TeamMembership, reason: string) {
    const endedAt = new Date().toISOString();
    await db().doc(membershipPath(target.teamId, target.id)).update({
      endedAt,
      endReason: reason,
    });
    await db().doc(teamIndexPath(target.userId, target.teamId)).delete();
    const teamSnap = await db().doc(teamPath(target.teamId)).get();
    const team = teamSnap.data() as TeamRecord | undefined;
    if (team?.successorMembershipId === target.id) {
      await teamSnap.ref.update({
        successorMembershipId: null,
        updatedAt: endedAt,
      });
    }
  }
}

function err(code: string, message: string) {
  return { status: "error" as const, code, message };
}

function inferRoleOp(
  current: TeamRole,
  next: Exclude<TeamRole, "owner">,
  isSelf: boolean,
) {
  if (isSelf && current === "admin") {
    if (next === "editor") return "self_demote_to_editor" as const;
    if (next === "viewer") return "self_demote_to_viewer" as const;
  }
  if (next === "admin") return "promote_to_admin" as const;
  if (current === "admin" && next === "editor") return "demote_to_editor" as const;
  if (current === "admin" && next === "viewer") return "demote_to_viewer" as const;
  if (
    (current === "editor" || current === "viewer") &&
    (next === "editor" || next === "viewer") &&
    current !== next
  ) {
    return "switch_editor_viewer" as const;
  }
  if (next === "editor") return "demote_to_editor" as const;
  if (next === "viewer") return "demote_to_viewer" as const;
  return null;
}

function sanitize(
  config: Record<string, unknown>,
  cleared: string[],
): Record<string, unknown> {
  const next = JSON.parse(JSON.stringify(config)) as Record<string, unknown>;
  const auth = next.auth as Record<string, unknown> | undefined;
  if (auth) {
    for (const key of ["token", "apiKey", "password", "username"]) {
      if (auth[key]) {
        auth[key] = "";
        cleared.push(`auth.${key}`);
      }
    }
  }
  return next;
}

function mask(value: unknown): unknown {
  if (value == null) return value;
  return JSON.parse(
    JSON.stringify(value).replace(/"(Bearer\s+)[^"]+"/gi, '"$1••••"'),
  );
}

/** Scheduled purge job — Chunk 9 */
export async function purgeDueTeams(): Promise<string[]> {
  const now = new Date().toISOString();
  const due = await db()
    .collection("teams")
    .where("status", "==", "deleted")
    .where("purgeAfter", "<=", now)
    .limit(20)
    .get();
  const purged: string[] = [];
  for (const doc of due.docs) {
    await doc.ref.update({ status: "deleting" });
    // Soft approach: delete team doc; subcollections cleaned by extension or follow-up batches
    await doc.ref.delete();
    purged.push(doc.id);
  }
  return purged;
}

export async function notifyPurgeWarnings(): Promise<number> {
  const now = Date.now();
  const in7d = new Date(now + 7 * 86400_000).toISOString();
  const in1d = new Date(now + 1 * 86400_000).toISOString();
  const teams = await db()
    .collection("teams")
    .where("status", "==", "deleted")
    .get();
  let n = 0;
  for (const doc of teams.docs) {
    const team = doc.data() as TeamRecord;
    if (!team.purgeAfter || !team.createdBy) continue;
    const purge = Date.parse(team.purgeAfter);
    const kind =
      Math.abs(purge - Date.parse(in1d)) < 3600_000
        ? "purge_warning_1d"
        : Math.abs(purge - Date.parse(in7d)) < 3600_000
          ? "purge_warning_7d"
          : null;
    if (!kind) continue;
    await db().collection(`users/${team.createdBy}/notifications`).add({
      teamId: team.id,
      kind,
      payload: { purgeAfter: team.purgeAfter },
      createdAt: new Date().toISOString(),
      readAt: null,
    });
    n += 1;
  }
  return n;
}
