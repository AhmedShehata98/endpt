import type { SyncStatus as SyncStatusKind } from "@modules/sync";
import { cn } from "@/lib/cn";

const labels: Record<SyncStatusKind, string> = {
  "local-only": "Local only",
  offline: "Offline",
  syncing: "Syncing…",
  synced: "Synced",
  failed: "Sync failed",
};

const dots: Record<SyncStatusKind, string> = {
  "local-only": "bg-text-subtle",
  offline: "bg-warning",
  syncing: "bg-info animate-pulse",
  synced: "bg-success",
  failed: "bg-error",
};

interface SyncStatusProps {
  status: SyncStatusKind;
  onRetry?: () => void;
  className?: string;
}

export function SyncStatus({ status, onRetry, className }: SyncStatusProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 text-[0.75rem] text-text-muted",
        className,
      )}
      title={labels[status]}
      role="status"
      aria-label={`Sync status: ${labels[status]}`}
    >
      <span className={cn("size-1.5 rounded-full", dots[status])} aria-hidden />
      <span>{labels[status]}</span>
      {status === "failed" && onRetry ? (
        <button
          type="button"
          className="text-accent underline-offset-2 hover:underline"
          onClick={onRetry}
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
