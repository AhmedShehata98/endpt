import { Button, SyncStatus } from "@/components";
import type { SyncStatus as SyncStatusKind } from "@modules/sync";
import { cn } from "@/lib/cn";

interface AppHeaderProps {
  requestName: string;
  breadcrumb?: string | null;
  unresolvedCount: number;
  syncStatus: SyncStatusKind;
  signedIn: boolean;
  displayName?: string | null;
  onOpenVariables: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  className?: string;
}

export function AppHeader({
  requestName,
  breadcrumb,
  unresolvedCount,
  syncStatus,
  signedIn,
  displayName,
  onOpenVariables,
  onSignIn,
  onSignOut,
  className,
}: AppHeaderProps) {
  return (
    <header
      className={cn(
        "flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border-default bg-bg-surface px-3",
        className,
      )}
    >
      <div className="min-w-0">
        {breadcrumb && (
          <p className="truncate text-[0.75rem] text-text-muted">{breadcrumb}</p>
        )}
        <h1 className="truncate text-sm font-semibold text-text-primary">
          {requestName || "Untitled Request"}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenVariables}
          aria-label={
            unresolvedCount > 0
              ? `Variables, ${unresolvedCount} unresolved`
              : "Variables"
          }
        >
          Variables
          {unresolvedCount > 0 && (
            <span className="rounded bg-error-subtle px-1.5 font-mono text-[0.6875rem] text-error">
              {unresolvedCount}
            </span>
          )}
        </Button>

        <SyncStatus status={syncStatus} />

        {signedIn ? (
          <div className="flex items-center gap-1.5">
            <span className="max-w-28 truncate text-[0.75rem] text-text-secondary">
              {displayName ?? "Account"}
            </span>
            <Button variant="ghost" size="sm" onClick={onSignOut}>
              Sign out
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={onSignIn}>
            Sign in
          </Button>
        )}
      </div>
    </header>
  );
}
