import { useCallback, useEffect, useMemo, useState } from "react";
import { createTeamService } from "@/app/composition";
import { Button } from "@/components";
import { useApplicationContext } from "@/state-management/application-context";
import { CreateTeamDialog } from "./CreateTeamDialog";
import { JoinTeamDialog } from "./JoinTeamDialog";
import { TeamList, type TeamListEntry } from "./TeamList";
import { TeamMembers } from "./TeamMembers";

export function TeamsPage() {
  const { signedIn, accountId, cloudUserId, goSignIn } = useApplicationContext();

  if (!signedIn) return <SignedOutGate onSignIn={goSignIn} />;

  return (
    <SignedInTeams userId={accountId ?? "guest"} cloudLinked={Boolean(cloudUserId)} />
  );
}

function SignedOutGate({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-md border border-border-default bg-bg-surface p-6 text-center">
        <h1 className="text-lg font-semibold text-text-primary">Teams</h1>
        <p className="mt-2 text-sm text-text-secondary">Sign in to create or join a team.</p>
        <Button variant="primary" className="mt-4 w-full" onClick={onSignIn}>
          Sign in
        </Button>
      </div>
    </div>
  );
}

function SignedInTeams({ userId, cloudLinked }: { userId: string; cloudLinked: boolean }) {
  const service = useMemo(() => createTeamService(userId), [userId]);
  const [teams, setTeams] = useState<TeamListEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  const refresh = useCallback(async () => {
    const list = await service.listMyTeams();
    if (list.status !== "ok") {
      setNotice(list.message);
      return;
    }
    setTeams(list.teams);
    setSelectedId((current) =>
      current && list.teams.some((row) => row.team.id === current) ? current : null,
    );
  }, [service]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selected = teams.find((row) => row.team.id === selectedId) ?? null;

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Teams</h1>
          <p className="mt-1 max-w-xl text-sm text-text-secondary">
            {cloudLinked
              ? "Create teams, manage members, and invite collaborators via Firestore (cloud-linked)."
              : "Create teams, manage members, and invite collaborators via Firestore. Link cloud sync in Settings first for multi-device teams; otherwise a local fake remote is used."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setJoinOpen(true)}>
            Join with token
          </Button>
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            Create team
          </Button>
        </div>
      </div>

      {notice && (
        <p className="rounded-md bg-bg-subtle px-3 py-2 text-sm text-text-secondary" role="status">
          {notice}
        </p>
      )}

      {selected ? (
        <TeamMembers
          team={selected.team}
          viewerRole={selected.membership.role}
          userId={userId}
          service={service}
          onNotice={setNotice}
          onLeft={() => {
            setSelectedId(null);
            void refresh();
          }}
          onBack={() => setSelectedId(null)}
        />
      ) : (
        <TeamList teams={teams} onSelect={setSelectedId} />
      )}

      <CreateTeamDialog
        open={createOpen}
        busy={busy}
        onClose={() => setCreateOpen(false)}
        onCreate={(name) => {
          setBusy(true);
          void service.createTeam({ name }).then(async (result) => {
            setBusy(false);
            if (result.status !== "ok") {
              setNotice(result.message);
              return;
            }
            setCreateOpen(false);
            setNotice(`Created team “${result.team.name}”.`);
            await refresh();
            setSelectedId(result.team.id);
          });
        }}
      />
      <JoinTeamDialog
        open={joinOpen}
        busy={busy}
        onClose={() => setJoinOpen(false)}
        onJoin={(token) => {
          setBusy(true);
          void service.acceptInvitation(token).then(async (result) => {
            setBusy(false);
            if (result.status !== "ok") {
              setNotice(result.message);
              return;
            }
            setJoinOpen(false);
            setNotice("Joined team.");
            await refresh();
            setSelectedId(result.teamId);
          });
        }}
      />
    </div>
  );
}
