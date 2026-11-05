import { useCallback, useEffect, useState } from "react";
import type { InvitationRole, TeamMembership, TeamRecord, TeamRole, TeamService } from "@modules/team";
import { Button, Dialog, Input, Select } from "@/components";
import { ASSIGNABLE_ROLES } from "./assignable-roles";

interface TeamMembersProps {
  team: TeamRecord;
  viewerRole: TeamRole;
  userId: string;
  service: TeamService;
  onNotice: (message: string) => void;
  onLeft: () => void;
  onBack: () => void;
}

type PendingConfirm = "leave" | "delete" | null;

export function TeamMembers({
  team,
  viewerRole,
  userId,
  service,
  onNotice,
  onLeft,
  onBack,
}: TeamMembersProps) {
  const [members, setMembers] = useState<TeamMembership[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InvitationRole>("viewer");
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<PendingConfirm>(null);

  const reloadMembers = useCallback(async () => {
    const listed = await service.listMembers(team.id);
    if (listed.status === "ok") setMembers(listed.members);
    else onNotice(listed.message);
  }, [onNotice, service, team.id]);

  useEffect(() => {
    void reloadMembers();
  }, [reloadMembers]);

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={onBack}>
          Teams
        </Button>
        <h2 className="text-sm font-semibold text-text-primary">{team.name}</h2>
        <span className="rounded-sm bg-bg-subtle px-1.5 py-0.5 text-[0.6875rem] uppercase text-text-secondary">
          {viewerRole}
        </span>
      </div>

      <ul className="divide-y divide-border-subtle overflow-auto rounded-md border border-border-default bg-bg-surface">
        {members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            currentUserId={userId}
            onRoleChange={(role) => {
              void service
                .changeMemberRole({ teamId: team.id, membershipId: member.id, newRole: role })
                .then(async (result) => {
                  onNotice(result.status === "ok" ? "Role updated." : result.message);
                  if (result.status === "ok") await reloadMembers();
                });
            }}
            onRemove={() => {
              void service
                .removeMember({ teamId: team.id, membershipId: member.id })
                .then(async (result) => {
                  onNotice(result.status === "ok" ? "Member removed." : result.message);
                  if (result.status === "ok") await reloadMembers();
                });
            }}
          />
        ))}
      </ul>

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void service
            .createInvitation({
              teamId: team.id,
              type: "email",
              email: inviteEmail,
              role: inviteRole,
            })
            .then((result) => {
              if (result.status !== "ok") {
                onNotice(result.message);
                return;
              }
              setInviteEmail("");
              setInviteToken(result.invitation.token ?? null);
              onNotice("Invitation created (token shown once).");
            });
        }}
      >
        <label className="flex min-w-56 flex-1 flex-col gap-1 text-sm">
          <span className="text-text-secondary">Invite email</span>
          <Input
            type="email"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-text-secondary">Role</span>
          <Select
            value={inviteRole}
            onChange={(event) => setInviteRole(event.target.value as InvitationRole)}
          >
            {ASSIGNABLE_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </Select>
        </label>
        <Button type="submit" variant="secondary">
          Invite
        </Button>
      </form>

      {inviteToken && (
        <p className="break-all rounded-md bg-bg-subtle px-3 py-2 font-mono text-xs text-text-secondary">
          Token: {inviteToken}
        </p>
      )}

      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => setConfirm("leave")}>
          Leave team
        </Button>
        <Button variant="destructive" onClick={() => setConfirm("delete")}>
          Soft-delete
        </Button>
      </div>

      <Dialog
        open={confirm !== null}
        title={confirm === "delete" ? "Soft-delete team" : "Leave team"}
        onClose={() => setConfirm(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant={confirm === "delete" ? "destructive" : "primary"}
              onClick={() => {
                const action = confirm;
                setConfirm(null);
                if (action === "leave") void leaveTeam(service, team.id, onNotice, onLeft);
                if (action === "delete") void deleteTeam(service, team.id, onNotice, onLeft);
              }}
            >
              {confirm === "delete" ? "Soft-delete" : "Leave"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          {confirm === "delete"
            ? "The team is hidden for 30 days and can be recovered until then."
            : "You will lose access to this team."}
        </p>
      </Dialog>
    </section>
  );
}

function MemberRow({
  member,
  currentUserId,
  onRoleChange,
  onRemove,
}: {
  member: TeamMembership;
  currentUserId: string;
  onRoleChange: (role: InvitationRole) => void;
  onRemove: () => void;
}) {
  const isOwner = member.role === "owner";
  const canRemove = member.userId !== currentUserId && !isOwner;

  return (
    <li className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
      <span className="text-text-secondary">{memberLabel(member.userId, currentUserId)}</span>
      {isOwner ? (
        <span className="text-xs uppercase text-text-muted">owner</span>
      ) : (
        <span className="flex items-center gap-1">
          <Select
            value={member.role}
            aria-label={`Role for ${memberLabel(member.userId, currentUserId)}`}
            onChange={(event) => onRoleChange(event.target.value as InvitationRole)}
          >
            {ASSIGNABLE_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </Select>
          {canRemove && (
            <Button variant="ghost" className="h-7 px-2 text-xs" onClick={onRemove}>
              Remove
            </Button>
          )}
        </span>
      )}
    </li>
  );
}

function memberLabel(userId: string, currentUserId: string): string {
  if (userId === currentUserId) return "You";
  return userId.length > 8 ? `${userId.slice(0, 8)}…` : userId;
}

async function leaveTeam(
  service: TeamService,
  teamId: string,
  onNotice: (message: string) => void,
  onLeft: () => void,
) {
  const result = await service.leaveTeam(teamId);
  onNotice(result.status === "ok" ? "Left team." : result.message);
  if (result.status === "ok") onLeft();
}

async function deleteTeam(
  service: TeamService,
  teamId: string,
  onNotice: (message: string) => void,
  onLeft: () => void,
) {
  const result = await service.softDeleteTeam(teamId);
  onNotice(result.status === "ok" ? "Team soft-deleted (30-day recovery)." : result.message);
  if (result.status === "ok") onLeft();
}
