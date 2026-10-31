import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-40 flex-col items-center justify-center gap-2 px-6 text-center",
        className,
      )}
    >
      <p className="text-sm font-medium text-text-primary">{title}</p>
      {description && <p className="max-w-sm text-[0.8125rem] text-text-muted">{description}</p>}
      {action}
    </div>
  );
}
