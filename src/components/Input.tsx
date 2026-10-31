import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean;
  invalid?: boolean;
}

export function Input({ className, mono, invalid, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-8 w-full rounded-md border bg-bg-surface px-2.5 text-sm text-text-primary placeholder:text-text-subtle",
        "border-border-default hover:border-border-strong focus:border-accent",
        mono && "font-mono text-[0.8125rem]",
        invalid && "border-error bg-error-subtle/40",
        className,
      )}
      {...props}
    />
  );
}
