import type { HttpMethod } from "@modules/request";
import { cn } from "@/lib/cn";

const methodColors: Record<HttpMethod, string> = {
  GET: "text-info bg-info-subtle",
  POST: "text-success bg-success-subtle",
  PUT: "text-warning bg-warning-subtle",
  PATCH: "text-warning bg-warning-subtle",
  DELETE: "text-error bg-error-subtle",
};

interface MethodBadgeProps {
  method: HttpMethod;
  className?: string;
}

export function MethodBadge({ method, className }: MethodBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-sm px-1.5 py-0.5 font-mono text-[0.6875rem] font-bold tracking-wider",
        methodColors[method],
        className,
      )}
    >
      {method}
    </span>
  );
}
