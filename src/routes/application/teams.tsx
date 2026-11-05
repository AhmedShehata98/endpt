import { useCallback, useEffect, useMemo, useState } from "react";
import type { TeamMembership, TeamRecord } from "@modules/team";
import { createTeamService } from "@/app/composition";
import { Button } from "@/components";
import { useApplicationContext } from "@/state-management/application-context";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/application/teams")({
  component: TeamsRoute,
});

function TeamsRoute() {
  const { signedIn, accountId, cloudUserId } = useApplicationContext();
  const userId = accountId ?? "guest";
  const cloudLinked = Boolean(cloudUserId);
  const service = useMemo(() => createTeamService(userId), [userId]);

  const [teams, setTeams] = useState<
    Array<{ team: TeamRecord; membership: TeamMembership }>
  >([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMembership[]>([]);
  const [name, setName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [acceptToken, setAcceptToken] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const list = await service.listMyTeams();
    if (list.status === "ok") {
      setTeams(list.teams);
      if (selectedId && !list.teams.some((t) => t.team.id === selectedId)) {
        setSelectedId(null);
      }
    }
  }, [service, selectedId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!selectedId) {
      setMembers([]);
      return;
    }
    void service.listMembers(selectedId).then((result) => {
      if (result.status === "ok") setMembers(result.members);
    });
  }, [selectedId, service]);

  if (!signedIn) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold text-text-primary">Teams</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Sign in to create or join teams. Team collaboration requires a cloud-linked
          account when Firebase is configured.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Teams</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Create teams, manage members, and invite collaborators via Firestore
          {cloudLinked
            ? " (cloud-linked)."
            : ". Link cloud sync in Settings first for multi-device teams; otherwise a local fake remote is used."}
        </p>
      </div>

      {message && (
        <p className="rounded-md bg-bg-subtle px-3 py-2 text-sm text-text-secondary" role="status">
          {message}
        </p>
      )}

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setBusy(true);
          void service.createTeam({ name }).then(async (result) => {
            setBusy(false);
            if (result.status === "ok") {
              setName("");
              setMessage(`Created team “${result.team.name}”.`);
              setSelectedId(result.team.id);
              await refresh();
            } else {
              setMessage(result.message);
            }
          });
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-text-secondary">New team name</span>
          <input
            className="h-9 rounded-md border border-border-default bg-bg-surface px-2 text-text-primary"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <Button type="submit" disabled={busy || !name.trim()}>
          Create team
        </Button>
      </form>

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setBusy(true);
          void service.acceptInvitation(acceptToken.trim()).then(async (result) => {
            setBusy(false);
            if (result.status === "ok") {
              setAcceptToken("");
              setMessage("Joined team.");
              setSelectedId(result.teamId);
              await refresh();
            } else {
              setMessage(result.message);
            }
          });
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-text-secondary">Accept invite token</span>
          <input
            className="h-9 min-w-64 rounded-md border border-border-default bg-bg-surface px-2 text-text-primary"
            value={acceptToken}
            onChange={(e) => setAcceptToken(e.target.value)}
          />
        </label>
        <Button type="submit" variant="secondary" disabled={busy || !acceptToken.trim()}>
          Accept invite
        </Button>
      </form>

      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-2">
        <section className="rounded-md border border-border-default p-3">
          <h2 className="text-sm font-medium text-text-primary">Your teams</h2>
          <ul className="mt-2 space-y-1">
            {teams.length === 0 && (
              <li className="text-sm text-text-secondary">No teams yet.</li>
            )}
            {teams.map(({ team, membership }) => (
              <li key={team.id}>
                <button
                  type="button"
                  className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${
                    selectedId === team.id
                      ? "bg-accent-subtle text-accent"
                      : "text-text-secondary hover:bg-bg-subtle"
                  }`}
                  onClick={() => setSelectedId(team.id)}
                >
                  {team.name}{" "}
                  <span className="text-xs opacity-70">({membership.role})</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-md border border-border-default p-3">
          <h2 className="text-sm font-medium text-text-primary">Members</h2>
          {!selectedId ? (
            <p className="mt-2 text-sm text-text-secondary">Select a team.</p>
          ) : (
            <>
              <ul className="mt-2 space-y-1">
                {members.map((member) => (
                  <li
                    key={member.id}
                    className="flex items-center justify-between gap-2 text-sm text-text-secondary"
                  >
                    <span>
                      {member.userId.slice(0, 8)}… — {member.role}
                    </span>
                    <span className="flex gap-1">
                      {member.role !== "owner" && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => {
                            void service
                              .changeMemberRole({
                                teamId: selectedId,
                                membershipId: member.id,
                                newRole:
                                  member.role === "viewer" ? "editor" : "viewer",
                              })
                              .then(async (result) => {
                                setMessage(
                                  result.status === "ok"
                                    ? "Role updated."
                                    : result.message,
                                );
                                const listed = await service.listMembers(selectedId);
                                if (listed.status === "ok") setMembers(listed.members);
                              });
                          }}
                        >
                          Toggle E/V
                        </Button>
                      )}
                      {member.userId !== userId && member.role !== "owner" && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => {
                            void service
                              .removeMember({
                                teamId: selectedId,
                                membershipId: member.id,
                              })
                              .then(async (result) => {
                                setMessage(
                                  result.status === "ok"
                                    ? "Member removed."
                                    : result.message,
                                );
                                const listed = await service.listMembers(selectedId);
                                if (listed.status === "ok") setMembers(listed.members);
                              });
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              <form
                className="mt-4 flex flex-wrap items-end gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void service
                    .createInvitation({
                      teamId: selectedId,
                      type: "email",
                      email: inviteEmail,
                      role: "viewer",
                    })
                    .then((result) => {
                      if (result.status === "ok") {
                        setInviteEmail("");
                        setInviteToken(result.invitation.token ?? null);
                        setMessage("Invitation created (token shown once).");
                      } else {
                        setMessage(result.message);
                      }
                    });
                }}
              >
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-text-secondary">Invite email</span>
                  <input
                    type="email"
                    className="h-9 rounded-md border border-border-default bg-bg-surface px-2 text-text-primary"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </label>
                <Button type="submit" variant="secondary">
                  Invite viewer
                </Button>
              </form>
              {inviteToken && (
                <p className="mt-2 break-all text-xs text-text-secondary">
                  Token: {inviteToken}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    void service.leaveTeam(selectedId).then(async (result) => {
                      setMessage(
                        result.status === "ok" ? "Left team." : result.message,
                      );
                      setSelectedId(null);
                      await refresh();
                    });
                  }}
                >
                  Leave team
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    void service.softDeleteTeam(selectedId).then(async (result) => {
                      setMessage(
                        result.status === "ok"
                          ? "Team soft-deleted (30-day recovery)."
                          : result.message,
                      );
                      setSelectedId(null);
                      await refresh();
                    });
                  }}
                >
                  Soft-delete
                </Button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
