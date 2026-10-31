import { cn } from "@/lib/cn";

interface StatusPillProps {
  status: number;
  statusText: string;
  className?: string;
}

function category(status: number): { label: string; tone: string } {
  if (status >= 200 && status < 300) {
    return { label: "Success", tone: "bg-success-subtle text-success" };
  }
  if (status >= 400 && status < 500) {
    return { label: "Client error", tone: "bg-warning-subtle text-warning" };
  }
  if (status >= 500) {
    return { label: "Server error", tone: "bg-error-subtle text-error" };
  }
  return { label: "Response", tone: "bg-info-subtle text-info" };
}

export function StatusPill({ status, statusText, className }: StatusPillProps) {
  const cat = category(status);
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "inline-flex h-5 items-center rounded-full px-2 font-mono text-[0.6875rem] font-bold",
          cat.tone,
        )}
      >
        {status} {statusText}
      </span>
      <span className="text-[0.75rem] text-text-muted">{cat.label}</span>
    </div>
  );
}
