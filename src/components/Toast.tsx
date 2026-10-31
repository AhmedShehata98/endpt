import { cn } from "@/lib/cn";

interface ToastProps {
  message: string;
  tone?: "info" | "success" | "error";
  className?: string;
}

const tones = {
  info: "border-border-default bg-bg-surface text-text-primary",
  success: "border-success/30 bg-success-subtle text-success",
  error: "border-error/30 bg-error-subtle text-error",
};

export function Toast({ message, tone = "info", className }: ToastProps) {
  return (
    <div
      role="status"
      className={cn(
        "rounded-md border px-3 py-2 text-sm shadow-[0_4px_6px_-2px_rgba(16,24,40,0.04)]",
        tones[tone],
        className,
      )}
    >
      {message}
    </div>
  );
}
