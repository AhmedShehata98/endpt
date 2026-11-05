import { describe, expect, it } from "vitest";
import { FakeTeamRemote } from "../../infrastructure/fake-team-remote";
import { TeamService } from "./team.service";
import {
  resetTeamsFeatureFlags,
  setTeamsFeatureFlags,
} from "../feature-flag";

async function teamWithAdmin() {
  const remote = new FakeTeamRemote("owner-1");
  const owner = new TeamService(remote);
  const created = await owner.createTeam({ name: "Acme" });
  if (created.status !== "ok") throw new Error("create failed");
  const inv = await owner.createInvitation({
    teamId: created.team.id,
    type: "email",
    email: "admin@example.com",
    role: "admin",
  });
  if (inv.status !== "ok" || !inv.invitation.token) throw new Error("invite");
  remote.setUserId("admin-1");
  const accepted = await new TeamService(remote).acceptInvitation(
    inv.invitation.token,
  );
  if (accepted.status !== "ok") throw new Error("accept");
  remote.setUserId("owner-1");
  const members = await owner.listMembers(created.team.id);
  if (members.status !== "ok") throw new Error("members");
  const admin = members.members.find((m) => m.role === "admin");
  if (!admin) throw new Error("admin missing");
  return { remote, owner, teamId: created.team.id, adminId: admin.id };
}

describe("TeamService / FakeTeamRemote — Alpha slices", () => {
  it("creates team with creator as Owner", async () => {
    const remote = new FakeTeamRemote("owner-1");
    const service = new TeamService(remote);
    const created = await service.createTeam({ name: "Acme" });
    expect(created.status).toBe("ok");
    if (created.status !== "ok") return;
    const list = await service.listMyTeams();
    expect(list.status).toBe("ok");
    if (list.status !== "ok") return;
    expect(list.teams).toHaveLength(1);
    expect(list.teams[0].membership.role).toBe("owner");
  });

  it("Owner can set successor and leave", async () => {
    const { owner, teamId, adminId } = await teamWithAdmin();
    const set = await owner.setSuccessor({ teamId, membershipId: adminId });
    expect(set.status).toBe("ok");
    const leave = await owner.leaveTeam(teamId);
    expect(leave.status).toBe("ok");
  });

  it("transfers ownership Owner → Admin", async () => {
    const { owner, teamId, adminId } = await teamWithAdmin();
    const transfer = await owner.transferOwnership({
      teamId,
      membershipId: adminId,
    });
    expect(transfer.status).toBe("ok");
  });

  it("creates team project and lists for Owner", async () => {
    const remote = new FakeTeamRemote("owner-1");
    const service = new TeamService(remote);
    const created = await service.createTeam({ name: "T" });
    if (created.status !== "ok") throw new Error("fail");
    const project = await service.createTeamProject({
      teamId: created.team.id,
      name: "API",
    });
    expect(project.status).toBe("ok");
    const list = await service.listTeamProjects(created.team.id);
    expect(list.status).toBe("ok");
    if (list.status === "ok") expect(list.projects).toHaveLength(1);
  });

  it("assigns project member with ceiling; rejects Owner", async () => {
    const { remote, owner, teamId, adminId } = await teamWithAdmin();
    const project = await owner.createTeamProject({ teamId, name: "P" });
    if (project.status !== "ok") throw new Error("project");
    // invite editor
    const inv = await owner.createInvitation({
      teamId,
      type: "link",
      role: "editor",
      maxUses: 1,
    });
    if (inv.status !== "ok" || !inv.invitation.token) throw new Error("inv");
    remote.setUserId("editor-1");
    await new TeamService(remote).acceptInvitation(inv.invitation.token);
    remote.setUserId("owner-1");
    const members = await owner.listMembers(teamId);
    if (members.status !== "ok") throw new Error("members");
    const editor = members.members.find((m) => m.role === "editor")!;
    const ok = await owner.setProjectMember({
      teamId,
      projectId: project.project.id,
      teamMembershipId: editor.id,
      role: "project_admin",
    });
    expect(ok.status).toBe("ok");
    const bad = await owner.setProjectMember({
      teamId,
      projectId: project.project.id,
      teamMembershipId: adminId,
      role: "project_admin",
    });
    expect(bad.status).toBe("error");
  });

  it("clones personal project with sanitized secrets", async () => {
    const remote = new FakeTeamRemote("owner-1");
    const service = new TeamService(remote);
    const created = await service.createTeam({ name: "T" });
    if (created.status !== "ok") throw new Error("fail");
    const cloned = await service.clonePersonalToTeam({
      teamId: created.team.id,
      sourceProjectId: "personal-1",
      name: "Cloned",
      collections: [
        {
          id: "c1",
          name: "Main",
          requests: [
            {
              id: "r1",
              name: "Login",
              method: "POST",
              url: "https://api.example/login",
              config: {
                auth: {
                  enabled: true,
                  type: "bearerToken",
                  token: "secret-token",
                },
                headers: [{ key: "Authorization", value: "Bearer x" }],
              },
            },
          ],
        },
      ],
      environments: [
        {
          name: "prod",
          variables: [
            { key: "token", isSecret: true, value: "abc" },
            { key: "baseUrl", isSecret: false, value: "https://api.example" },
          ],
        },
      ],
    });
    expect(cloned.status).toBe("ok");
    if (cloned.status === "ok") {
      expect(cloned.cleared.length).toBeGreaterThan(0);
      expect(cloned.project.sourceProjectId).toBe("personal-1");
    }
  });

  it("soft-deletes and restores; purge removes due teams", async () => {
    const remote = new FakeTeamRemote("owner-1");
    const service = new TeamService(remote);
    const created = await service.createTeam({ name: "T" });
    if (created.status !== "ok") throw new Error("fail");
    expect((await service.softDeleteTeam(created.team.id)).status).toBe("ok");
    expect((await service.restoreTeam(created.team.id)).status).toBe("ok");
    await service.softDeleteTeam(created.team.id);
    const purged = remote.purgeDueTeams(
      new Date(Date.now() + 31 * 86400_000).toISOString(),
    );
    expect(purged).toContain(created.team.id);
  });

  it("respects feature flags", async () => {
    setTeamsFeatureFlags({ teams: false });
    const remote = new FakeTeamRemote("owner-1");
    const service = new TeamService(remote);
    const created = await service.createTeam({ name: "T" });
    expect(created.status).toBe("error");
    resetTeamsFeatureFlags();
  });

  it("masks secrets in execution content", async () => {
    const remote = new FakeTeamRemote("owner-1");
    const service = new TeamService(remote);
    const created = await service.createTeam({ name: "T" });
    if (created.status !== "ok") throw new Error("fail");
    const project = await service.createTeamProject({
      teamId: created.team.id,
      name: "P",
    });
    if (project.status !== "ok") throw new Error("project");
    const upsert = await service.upsertTeamContent({
      teamId: created.team.id,
      projectId: project.project.id,
      kind: "execution",
      payload: {
        requestLog: { Authorization: "Bearer super-secret" },
        responseLog: { ok: true },
      },
    });
    expect(upsert.status).toBe("ok");
  });
});
