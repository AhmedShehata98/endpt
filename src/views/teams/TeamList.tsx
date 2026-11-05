import type { TeamMembership, TeamRecord, TeamRole } from "@modules/team";
import { EmptyState } from "@/components";
import { cn } from "@/lib/cn";

export interface TeamListEntry {
  team: TeamRecord;
  membership: TeamMembership;
}

interface TeamListProps {
  teams: TeamListEntry[];
  onSelect: (teamId: string) => void;
}

export function TeamList({ teams, onSelect }: TeamListProps) {
  if (teams.length === 0) {
    return (
      <EmptyState
        title="No teams yet"
        description="Create a team or join one with an invite token."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border-default bg-bg-surface">
      <div className="flex items-center justify-between border-b border-border-subtle px-3 py-2 text-[0.6875rem] font-medium uppercase tracking-wide text-text-muted">
        <span>Team</span>
        <span>Role</span>
      </div>
      <ul>
        {teams.map(({ team, membership }) => (
          <li key={team.id} className="border-b border-border-subtle last:border-b-0">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-bg-subtle"
              onClick={() => onSelect(team.id)}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-text-primary">
                  {team.name}
                </span>
                <span className="block truncate font-mono text-xs text-text-muted">{team.id}</span>
              </span>
              <RoleBadge role={membership.role} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RoleBadge({ role }: { role: TeamRole }) {
  const owner = role === "owner";
  return (
    <span
      className={cn(
        "shrink-0 rounded-sm px-1.5 py-0.5 text-[0.6875rem] font-medium uppercase",
        owner ? "bg-accent text-accent-on" : "bg-bg-subtle text-text-secondary",
      )}
    >
      {role}
    </span>
  );
}
