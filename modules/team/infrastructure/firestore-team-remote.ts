import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  setDoc,
  updateDoc,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import {
  readFirebaseWebConfig,
  type FirebaseWebConfig,
} from "@modules/sync/infrastructure/firebase-sync-remote";
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
  TeamRemote,
} from "../ports/team-remote.interface";
import type {
  ProjectRole,
  TeamMembership,
  TeamProject,
  TeamRecord,
  TeamRole,
} from "../types/team.types";

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

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "proxy-authorization",
]);

/**
 * Spark-compatible TeamRemote: client Firestore writes + shared policy.
 * No Cloud Functions / Blaze plan required.
 */
export class FirestoreTeamRemote implements TeamRemote {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private db: Firestore | null = null;

  constructor(
    private readonly config: FirebaseWebConfig | null = readFirebaseWebConfig(),
    private readonly createId: () => string = () => crypto.randomUUID(),
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  private ensure(): { auth: Auth; db: Firestore; uid: string } {
    if (!this.config) throw new Error("Firebase is not configured");
    if (!this.app) {
      this.app = getApps().length ? getApp() : initializeApp(this.config);
      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);
    }
    const uid = this.auth!.currentUser?.uid;
    if (!uid) throw new Error("Not signed in to Firebase. Link cloud sync first.");
    return { auth: this.auth!, db: this.db!, uid };
  }

  private async safe<T>(
    run: () => Promise<T>,
  ): Promise<T | { status: "error"; code: string; message: string }> {
    try {
      return await run();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Team operation failed";
      return { status: "error", code: "REMOTE_ERROR", message };
    }
  }

  async ping() {
    try {
      this.ensure();
      return { ok: true as const };
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : "ping failed",
      };
    }
  }

  createTeam(input: TeamCreateInput) {
    return this.safe(async () => {
      if (!isTeamsFeatureEnabled("teams")) {
        return {
          status: "error" as const,
          code: "FEATURE_DISABLED",
          message: "Teams disabled",
        };
      }
      const { db, uid } = this.ensure();
      const name = input.name.trim();
      if (!name) {
        return { status: "error" as const, code: "INVALID", message: "Name required" };
      }
      const slug = `${(input.slug?.trim() || slugify(name)).toLowerCase()}-${this.createId().slice(0, 6)}`;

      const now = this.now();
      const teamRef = doc(collection(db, "teams"));
      const membershipRef = doc(collection(db, "teams", teamRef.id, "memberships"));
      const team: TeamRecord = {
        id: teamRef.id,
        name,
        slug,
        status: "active",
        successorMembershipId: null,
        createdBy: uid,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        purgeAfter: null,
      };
      const membership: TeamMembership = {
        id: membershipRef.id,
        teamId: teamRef.id,
        userId: uid,
        role: "owner",
        joinedAt: now,
        endedAt: null,
        endReason: null,
      };
      const batch = writeBatch(db);
      batch.set(teamRef, team);
      batch.set(membershipRef, membership);
      batch.set(doc(db, "users", uid, "teamIndex", teamRef.id), {
        teamId: teamRef.id,
        membershipId: membershipRef.id,
        role: "owner",
        updatedAt: now,
      });
      await batch.commit();
      return { status: "ok" as const, team };
    });
  }

  updateTeam(input: { teamId: string; name: string }) {
    return this.safe(async () => {
      const ctx = await this.loadActive(input.teamId);
      if (ctx.status === "error") return ctx;
      const authz = authorizeTeam({
        team: ctx.team,
        membership: ctx.membership,
        permission: "team.update",
      });
      if (!authz.allowed) {
        return { status: "error" as const, code: authz.reason, message: authz.reason };
      }
      const name = input.name.trim();
      if (!name) {
        return { status: "error" as const, code: "INVALID", message: "Name required" };
      }
      const team = { ...ctx.team, name, updatedAt: this.now() };
      await setDoc(doc(ctx.db, "teams", input.teamId), team);
      return { status: "ok" as const, team };
    });
  }

  listMyTeams() {
    return this.safe(async () => {
      const { db, uid } = this.ensure();
      const index = await getDocs(collection(db, "users", uid, "teamIndex"));
      const teams: Array<{ team: TeamRecord; membership: TeamMembership }> = [];
      for (const row of index.docs) {
        const teamId = row.id;
        const teamSnap = await getDoc(doc(db, "teams", teamId));
        if (!teamSnap.exists()) continue;
        const team = teamSnap.data() as TeamRecord;
        if (team.status !== "active") continue;
        const membershipId = row.data().membershipId as string;
        const mSnap = await getDoc(
          doc(db, "teams", teamId, "memberships", membershipId),
        );
        if (!mSnap.exists()) continue;
        const membership = mSnap.data() as TeamMembership;
        if (membership.endedAt != null) continue;
        teams.push({ team, membership });
      }
      return { status: "ok" as const, teams };
    });
  }

  listMembers(teamId: string) {
    return this.safe(async () => {
      const ctx = await this.loadActive(teamId);
      if (ctx.status === "error") return ctx;
      const authz = authorizeTeam({
        team: ctx.team,
        membership: ctx.membership,
        permission: "team.members.view",
      });
      if (!authz.allowed) {
        return { status: "error" as const, code: authz.reason, message: authz.reason };
      }
      const snap = await getDocs(collection(ctx.db, "teams", teamId, "memberships"));
      const members = snap.docs
        .map((d) => d.data() as TeamMembership)
        .filter((m) => m.endedAt == null);
      return { status: "ok" as const, members };
    });
  }

  changeMemberRole(input: MemberChangeRoleInput) {
    return this.safe(async () => {
      const ctx = await this.loadActive(input.teamId);
      if (ctx.status === "error") return ctx;
      const targetSnap = await getDoc(
        doc(ctx.db, "teams", input.teamId, "memberships", input.membershipId),
      );
      if (!targetSnap.exists()) {
        return { status: "error" as const, code: "NOT_FOUND", message: "Member not found" };
      }
      const target = targetSnap.data() as TeamMembership;
      if (target.endedAt != null) {
        return { status: "error" as const, code: "NOT_FOUND", message: "Member not found" };
      }
      const isSelf = target.userId === ctx.uid;
      const operation = inferRoleOp(target.role, input.newRole, isSelf);
      if (!operation) {
        return { status: "error" as const, code: "INVALID", message: "Invalid role change" };
      }
      const allowed = canManageMember({
        actorRole: ctx.membership.role,
        targetRole: target.role,
        isSelf,
        operation,
      });
      if (!allowed.allowed) {
        return { status: "error" as const, code: allowed.reason, message: allowed.reason };
      }
      const nextRole = roleAfterOperation(target.role, operation) ?? input.newRole;
      await updateDoc(targetSnap.ref, { role: nextRole });
      await setDoc(
        doc(ctx.db, "users", target.userId, "teamIndex", input.teamId),
        {
          teamId: input.teamId,
          membershipId: target.id,
          role: nextRole,
          updatedAt: this.now(),
        },
        { merge: true },
      );
      return { status: "ok" as const };
    });
  }

  removeMember(input: MemberRemoveInput) {
    return this.safe(async () => {
      const ctx = await this.loadActive(input.teamId);
      if (ctx.status === "error") return ctx;
      const targetSnap = await getDoc(
        doc(ctx.db, "teams", input.teamId, "memberships", input.membershipId),
      );
      if (!targetSnap.exists()) {
        return { status: "error" as const, code: "NOT_FOUND", message: "Not found" };
      }
      const target = targetSnap.data() as TeamMembership;
      const allowed = canManageMember({
        actorRole: ctx.membership.role,
        targetRole: target.role,
        isSelf: false,
        operation: "remove",
      });
      if (!allowed.allowed) {
        return { status: "error" as const, code: allowed.reason, message: allowed.reason };
      }
      await this.endMembership(ctx.db, target, "removed");
      return { status: "ok" as const };
    });
  }

  leaveTeam(teamId: string) {
    return this.safe(async () => {
      const ctx = await this.loadActive(teamId);
      if (ctx.status === "error") return ctx;
      const successorOk =
        ctx.team.successorMembershipId != null &&
        (await this.isActiveAdmin(ctx.db, teamId, ctx.team.successorMembershipId));
      const allowed = canManageMember({
        actorRole: ctx.membership.role,
        targetRole: ctx.membership.role,
        isSelf: true,
        operation: "leave",
        hasValidSuccessor: successorOk,
      });
      if (!allowed.allowed) {
        return { status: "error" as const, code: allowed.reason, message: allowed.reason };
      }
      if (ctx.membership.role === "owner" && ctx.team.successorMembershipId) {
        await updateDoc(
          doc(ctx.db, "teams", teamId, "memberships", ctx.team.successorMembershipId),
          { role: "owner" },
        );
        await updateDoc(doc(ctx.db, "teams", teamId), {
          successorMembershipId: null,
          updatedAt: this.now(),
        });
      }
      await this.endMembership(ctx.db, ctx.membership, "left");
      return { status: "ok" as const };
    });
  }

  setSuccessor(input: { teamId: string; membershipId: string | null }) {
    return this.safe(async () => {
      const ctx = await this.loadActive(input.teamId);
      if (ctx.status === "error") return ctx;
      const authz = authorizeTeam({
        team: ctx.team,
        membership: ctx.membership,
        permission: "team.successor.manage",
      });
      if (!authz.allowed) {
        return { status: "error" as const, code: authz.reason, message: authz.reason };
      }
      if (
        input.membershipId != null &&
        !(await this.isActiveAdmin(ctx.db, input.teamId, input.membershipId))
      ) {
        return {
          status: "error" as const,
          code: "SUCCESSOR_MUST_BE_ACTIVE_ADMIN",
          message: "Successor must be an active Admin",
        };
      }
      await updateDoc(doc(ctx.db, "teams", input.teamId), {
        successorMembershipId: input.membershipId,
        updatedAt: this.now(),
      });
      return { status: "ok" as const };
    });
  }

  transferOwnership(input: { teamId: string; membershipId: string }) {
    return this.safe(async () => {
      const ctx = await this.loadActive(input.teamId);
      if (ctx.status === "error") return ctx;
      const authz = authorizeTeam({
        team: ctx.team,
        membership: ctx.membership,
        permission: "team.ownership.transfer",
      });
      if (!authz.allowed) {
        return { status: "error" as const, code: authz.reason, message: authz.reason };
      }
      if (!(await this.isActiveAdmin(ctx.db, input.teamId, input.membershipId))) {
        return {
          status: "error" as const,
          code: "INVALID",
          message: "Target must be an active Admin",
        };
      }
      const batch = writeBatch(ctx.db);
      batch.update(doc(ctx.db, "teams", input.teamId, "memberships", ctx.membership.id), {
        role: "admin",
      });
      batch.update(doc(ctx.db, "teams", input.teamId, "memberships", input.membershipId), {
        role: "owner",
      });
      batch.update(doc(ctx.db, "teams", input.teamId), {
        successorMembershipId: null,
        updatedAt: this.now(),
      });
      await batch.commit();
      return { status: "ok" as const };
    });
  }

  createInvitation(input: InviteCreateInput) {
    return this.safe(async () => {
      if (!isTeamsFeatureEnabled("invitations")) {
        return {
          status: "error" as const,
          code: "FEATURE_DISABLED",
          message: "Invitations disabled",
        };
      }
      const ctx = await this.loadActive(input.teamId);
      if (ctx.status === "error") return ctx;
      const authz = authorizeTeam({
        team: ctx.team,
        membership: ctx.membership,
        permission: "team.members.invite",
      });
      if (!authz.allowed) {
        return { status: "error" as const, code: authz.reason, message: authz.reason };
      }
      if (
        input.role === "admin" &&
        (ctx.membership.role !== "owner" || input.type !== "email")
      ) {
        return {
          status: "error" as const,
          code: "INVALID_ROLE",
          message: "Admin invite only by Owner via email",
        };
      }
      const hours = input.expiresInHours ?? 24 * 7;
      if (hours < 1 || hours > 24 * 30) {
        return {
          status: "error" as const,
          code: "INVALID_EXPIRY",
          message: "Expiry out of range",
        };
      }
      const maxUses =
        input.type === "email" ? 1 : Math.min(Math.max(input.maxUses ?? 1, 1), 100);
      const token = `${this.createId()}${this.createId()}`;
      const tokenHash = await sha256Hex(token);
      const inviteRef = doc(collection(ctx.db, "teams", input.teamId, "invitations"));
      const now = this.now();
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
        tokenHash,
        createdBy: ctx.uid,
        createdAt: now,
        revokedAt: null,
        revokeReason: null,
        replacedById: null,
      };
      if (input.type === "email" && !invitation.email) {
        return { status: "error" as const, code: "INVALID", message: "Email required" };
      }
      const batch = writeBatch(ctx.db);
      batch.set(inviteRef, invitation);
      batch.set(doc(ctx.db, "inviteTokens", tokenHash), {
        teamId: input.teamId,
        invitationId: inviteRef.id,
        status: "pending",
      });
      await batch.commit();
      return { status: "ok" as const, invitation: { ...invitation, token } };
    });
  }

  acceptInvitation(input: InviteAcceptInput) {
    return this.safe(async () => {
      const { db, uid, auth } = this.ensure();
      const tokenHash = await sha256Hex(input.token);
      const tokenSnap = await getDoc(doc(db, "inviteTokens", tokenHash));
      if (!tokenSnap.exists()) {
        return {
          status: "error" as const,
          code: "INVALID_INVITE",
          message: "Invalid invitation",
        };
      }
      const { teamId, invitationId } = tokenSnap.data() as {
        teamId: string;
        invitationId: string;
      };
      const inviteSnap = await getDoc(
        doc(db, "teams", teamId, "invitations", invitationId),
      );
      if (!inviteSnap.exists()) {
        return {
          status: "error" as const,
          code: "INVALID_INVITE",
          message: "Invalid invitation",
        };
      }
      const invite = inviteSnap.data();
      if (invite.status !== "pending" || Date.parse(invite.expiresAt) < Date.now()) {
        return {
          status: "error" as const,
          code: "INVALID_INVITE",
          message: "Invalid invitation",
        };
      }
      if (invite.usesCount >= invite.maxUses) {
        return {
          status: "error" as const,
          code: "INVALID_INVITE",
          message: "Invalid invitation",
        };
      }
      const existing = await this.findActiveMembership(db, teamId, uid);
      if (existing) {
        return {
          status: "error" as const,
          code: "ALREADY_A_MEMBER",
          message: "Already a member",
        };
      }
      if (invite.type === "email" && invite.email) {
        const email = auth.currentUser?.email?.toLowerCase();
        const verified = auth.currentUser?.emailVerified;
        if (!verified || email !== invite.email) {
          return {
            status: "error" as const,
            code: "EMAIL_MISMATCH",
            message: "Email does not match invitation",
          };
        }
      }
      const now = this.now();
      const membershipRef = doc(collection(db, "teams", teamId, "memberships"));
      const usesCount = invite.usesCount + 1;
      const exhausted = usesCount >= invite.maxUses;
      const batch = writeBatch(db);
      batch.set(membershipRef, {
        id: membershipRef.id,
        teamId,
        userId: uid,
        role: invite.role,
        joinedAt: now,
        endedAt: null,
        endReason: null,
      });
      batch.update(inviteSnap.ref, {
        usesCount,
        status: exhausted ? "exhausted" : "pending",
      });
      if (exhausted) {
        batch.update(doc(db, "inviteTokens", tokenHash), { status: "exhausted" });
      }
      batch.set(doc(db, "users", uid, "teamIndex", teamId), {
        teamId,
        membershipId: membershipRef.id,
        role: invite.role,
        updatedAt: now,
      });
      await batch.commit();
      return {
        status: "ok" as const,
        teamId,
        membershipId: membershipRef.id,
      };
    });
  }

  revokeInvitation(input: { teamId: string; invitationId: string }) {
    return this.safe(async () => {
      const ctx = await this.loadActive(input.teamId);
      if (ctx.status === "error") return ctx;
      const authz = authorizeTeam({
        team: ctx.team,
        membership: ctx.membership,
        permission: "team.invitations.manage",
      });
      if (!authz.allowed) {
        return { status: "error" as const, code: authz.reason, message: authz.reason };
      }
      const inviteRef = doc(
        ctx.db,
        "teams",
        input.teamId,
        "invitations",
        input.invitationId,
      );
      const snap = await getDoc(inviteRef);
      if (!snap.exists()) {
        return { status: "error" as const, code: "NOT_FOUND", message: "Not found" };
      }
      const tokenHash = snap.data().tokenHash as string;
      const batch = writeBatch(ctx.db);
      batch.update(inviteRef, {
        status: "revoked",
        revokedAt: this.now(),
        revokeReason: "manual",
      });
      batch.update(doc(ctx.db, "inviteTokens", tokenHash), { status: "revoked" });
      await batch.commit();
      return { status: "ok" as const };
    });
  }

  resendInvitation(input: { teamId: string; invitationId: string }) {
    return this.safe(async () => {
      const ctx = await this.loadActive(input.teamId);
      if (ctx.status === "error") return ctx;
      const snap = await getDoc(
        doc(ctx.db, "teams", input.teamId, "invitations", input.invitationId),
      );
      if (!snap.exists()) {
        return { status: "error" as const, code: "NOT_FOUND", message: "Not found" };
      }
      const old = snap.data();
      await this.revokeInvitation(input);
      await updateDoc(snap.ref, { revokeReason: "replaced" });
      return this.createInvitation({
        teamId: input.teamId,
        type: old.type,
        email: old.email ?? undefined,
        role: old.role,
        maxUses: old.maxUses,
      });
    });
  }

  createTeamProject(input: { teamId: string; name: string }) {
    return this.safe(async () => {
      const ctx = await this.loadActive(input.teamId);
      if (ctx.status === "error") return ctx;
      const authz = authorizeTeam({
        team: ctx.team,
        membership: ctx.membership,
        permission: "team.projects.create",
      });
      if (!authz.allowed) {
        return { status: "error" as const, code: authz.reason, message: authz.reason };
      }
      const now = this.now();
      const ref = doc(collection(ctx.db, "teams", input.teamId, "projects"));
      const project: TeamProject = {
        id: ref.id,
        teamId: input.teamId,
        name: input.name.trim(),
        settings: {},
        sourceProjectId: null,
        createdBy: ctx.uid,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(ref, project);
      return { status: "ok" as const, project };
    });
  }

  deleteTeamProject(input: { teamId: string; projectId: string }) {
    return this.safe(async () => {
      const ctx = await this.loadActive(input.teamId);
      if (ctx.status === "error") return ctx;
      const authz = authorizeTeam({
        team: ctx.team,
        membership: ctx.membership,
        permission: "team.projects.delete",
      });
      if (!authz.allowed) {
        return { status: "error" as const, code: authz.reason, message: authz.reason };
      }
      await updateDoc(doc(ctx.db, "teams", input.teamId, "projects", input.projectId), {
        deletedAt: this.now(),
      });
      return { status: "ok" as const };
    });
  }

  listTeamProjects(teamId: string) {
    return this.safe(async () => {
      const ctx = await this.loadActive(teamId);
      if (ctx.status === "error") return ctx;
      const snap = await getDocs(collection(ctx.db, "teams", teamId, "projects"));
      const projects = snap.docs
        .map((d) => d.data() as TeamProject)
        .filter((p) => (p as { deletedAt?: string | null }).deletedAt == null);
      return { status: "ok" as const, projects };
    });
  }

  setProjectMember(input: {
    teamId: string;
    projectId: string;
    teamMembershipId: string;
    role: ProjectRole;
  }) {
    return this.safe(async () => {
      const ctx = await this.loadActive(input.teamId);
      if (ctx.status === "error") return ctx;
      const targetSnap = await getDoc(
        doc(ctx.db, "teams", input.teamId, "memberships", input.teamMembershipId),
      );
      if (!targetSnap.exists()) {
        return { status: "error" as const, code: "NOT_FOUND", message: "Target not found" };
      }
      const target = targetSnap.data() as TeamMembership;
      if (target.endedAt != null) {
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
      const ref = doc(
        collection(ctx.db, "teams", input.teamId, "projects", input.projectId, "members"),
      );
      await setDoc(ref, {
        id: ref.id,
        projectId: input.projectId,
        teamId: input.teamId,
        teamMembershipId: input.teamMembershipId,
        role: input.role,
        startedAt: this.now(),
        endedAt: null,
        endReason: null,
      });
      return { status: "ok" as const };
    });
  }

  listProjectMembers(input: { teamId: string; projectId: string }) {
    return this.safe(async () => {
      const ctx = await this.loadActive(input.teamId);
      if (ctx.status === "error") return ctx;
      const membersSnap = await getDocs(
        collection(ctx.db, "teams", input.teamId, "memberships"),
      );
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
      const pm = await getDocs(
        collection(
          ctx.db,
          "teams",
          input.teamId,
          "projects",
          input.projectId,
          "members",
        ),
      );
      for (const d of pm.docs) {
        const row = d.data();
        if (row.endedAt != null) continue;
        const tm = membersSnap.docs
          .find((x) => x.id === row.teamMembershipId)
          ?.data() as TeamMembership | undefined;
        if (!tm) continue;
        members.push({
          kind: "explicit" as const,
          membershipId: row.id as string,
          userId: tm.userId,
          role: row.role as ProjectRole,
        });
      }
      return { status: "ok" as const, members };
    });
  }

  upsertTeamContent(input: {
    teamId: string;
    projectId: string;
    kind: "collection" | "request" | "environment" | "variable" | "execution";
    payload: Record<string, unknown>;
  }) {
    return this.safe(async () => {
      const ctx = await this.loadActive(input.teamId);
      if (ctx.status === "error") return ctx;
      const id = (input.payload.id as string) || this.createId();
      const stored: Record<string, unknown> = { ...input.payload, id };
      if (input.kind === "variable" && stored.isSecret === true) {
        stored.value = null;
        if (typeof input.payload.secretValue === "string") {
          stored.secretCiphertext = btoa(String(input.payload.secretValue));
        }
        delete stored.secretValue;
      }
      if (input.kind === "execution") {
        stored.requestLog = mask(stored.requestLog);
        stored.responseLog = mask(stored.responseLog);
        stored.executedBy = ctx.uid;
      }
      const kind =
        input.kind === "collection"
          ? "collections"
          : input.kind === "request"
            ? "requests"
            : input.kind === "environment"
              ? "environments"
              : input.kind === "variable"
                ? "variables"
                : "executions";
      await setDoc(
        doc(ctx.db, "teams", input.teamId, "projects", input.projectId, kind, id),
        stored,
      );
      return { status: "ok" as const, id };
    });
  }

  clonePersonalToTeam(input: ClonePersonalToTeamInput) {
    return this.safe(async () => {
      if (!isTeamsFeatureEnabled("clone")) {
        return {
          status: "error" as const,
          code: "FEATURE_DISABLED",
          message: "Clone disabled",
        };
      }
      const created = await this.createTeamProject({
        teamId: input.teamId,
        name: input.name,
      });
      if (created.status !== "ok") return created;
      const cleared: string[] = [];
      await updateDoc(
        doc(
          this.ensure().db,
          "teams",
          input.teamId,
          "projects",
          created.project.id,
        ),
        { sourceProjectId: input.sourceProjectId },
      );
      for (const collectionNode of input.collections) {
        const c = await this.upsertTeamContent({
          teamId: input.teamId,
          projectId: created.project.id,
          kind: "collection",
          payload: { name: collectionNode.name },
        });
        if (c.status !== "ok") continue;
        for (const request of collectionNode.requests) {
          const config = sanitize(request.config, cleared);
          await this.upsertTeamContent({
            teamId: input.teamId,
            projectId: created.project.id,
            kind: "request",
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
        const e = await this.upsertTeamContent({
          teamId: input.teamId,
          projectId: created.project.id,
          kind: "environment",
          payload: { name: env.name },
        });
        if (e.status !== "ok") continue;
        for (const variable of env.variables) {
          await this.upsertTeamContent({
            teamId: input.teamId,
            projectId: created.project.id,
            kind: "variable",
            payload: {
              environmentId: e.id,
              key: variable.key,
              isSecret: variable.isSecret,
              value: variable.isSecret ? null : variable.value,
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
    });
  }

  softDeleteTeam(teamId: string) {
    return this.safe(async () => {
      const ctx = await this.loadActive(teamId);
      if (ctx.status === "error") return ctx;
      const authz = authorizeTeam({
        team: ctx.team,
        membership: ctx.membership,
        permission: "team.delete",
      });
      if (!authz.allowed) {
        return { status: "error" as const, code: authz.reason, message: authz.reason };
      }
      const deletedAt = this.now();
      const purgeAfter = new Date(Date.now() + 30 * 86400_000).toISOString();
      await updateDoc(doc(ctx.db, "teams", teamId), {
        status: "deleted",
        deletedAt,
        purgeAfter,
        updatedAt: deletedAt,
      });
      return { status: "ok" as const };
    });
  }

  restoreTeam(teamId: string) {
    return this.safe(async () => {
      const { db, uid } = this.ensure();
      const teamSnap = await getDoc(doc(db, "teams", teamId));
      if (!teamSnap.exists()) {
        return { status: "error" as const, code: "NOT_FOUND", message: "Not found" };
      }
      const team = teamSnap.data() as TeamRecord;
      const membership = await this.findActiveMembership(db, teamId, uid);
      if (!membership || membership.role !== "owner") {
        return {
          status: "error" as const,
          code: "permission_denied",
          message: "Owner only",
        };
      }
      if (team.status !== "deleted") {
        return {
          status: "error" as const,
          code: "INVALID",
          message: "Team not soft-deleted",
        };
      }
      await updateDoc(teamSnap.ref, {
        status: "active",
        deletedAt: null,
        purgeAfter: null,
        updatedAt: this.now(),
      });
      return { status: "ok" as const };
    });
  }

  private async loadActive(teamId: string) {
    const { db, uid } = this.ensure();
    const teamSnap = await getDoc(doc(db, "teams", teamId));
    if (!teamSnap.exists()) {
      return { status: "error" as const, code: "NOT_FOUND", message: "Team not found" };
    }
    const team = teamSnap.data() as TeamRecord;
    const membership = await this.findActiveMembership(db, teamId, uid);
    if (!membership) {
      return { status: "error" as const, code: "not_a_member", message: "Not a member" };
    }
    return { status: "ok" as const, db, uid, team, membership };
  }

  private async findActiveMembership(
    db: Firestore,
    teamId: string,
    userId: string,
  ): Promise<TeamMembership | null> {
    const index = await getDoc(doc(db, "users", userId, "teamIndex", teamId));
    if (!index.exists()) return null;
    const membershipId = index.data().membershipId as string | undefined;
    if (!membershipId) return null;
    const snap = await getDoc(doc(db, "teams", teamId, "memberships", membershipId));
    if (!snap.exists()) return null;
    const membership = snap.data() as TeamMembership;
    if (membership.endedAt != null || membership.userId !== userId) return null;
    return membership;
  }

  private async isActiveAdmin(db: Firestore, teamId: string, membershipId: string) {
    const snap = await getDoc(doc(db, "teams", teamId, "memberships", membershipId));
    if (!snap.exists()) return false;
    const m = snap.data() as TeamMembership;
    return m.endedAt == null && m.role === "admin";
  }

  private async endMembership(
    db: Firestore,
    target: TeamMembership,
    reason: string,
  ): Promise<void> {
    const endedAt = this.now();
    const batch = writeBatch(db);
    batch.update(doc(db, "teams", target.teamId, "memberships", target.id), {
      endedAt,
      endReason: reason,
    });
    batch.delete(doc(db, "users", target.userId, "teamIndex", target.teamId));
    const teamSnap = await getDoc(doc(db, "teams", target.teamId));
    const team = teamSnap.data() as TeamRecord | undefined;
    if (team?.successorMembershipId === target.id) {
      batch.update(teamSnap.ref, {
        successorMembershipId: null,
        updatedAt: endedAt,
      });
    }
    await batch.commit();
  }
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

function mask(value: unknown): unknown {
  if (value == null) return value;
  return JSON.parse(
    JSON.stringify(value).replace(/"(Bearer\s+)[^"]+"/gi, '"$1••••"'),
  );
}
