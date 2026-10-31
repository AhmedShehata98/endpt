import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  mono?: boolean;
}

export function Select({ className, mono, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "h-8 rounded-md border border-border-default bg-bg-subtle px-2 text-sm text-text-primary",
        "hover:border-border-strong focus:border-accent",
        mono && "font-mono text-[0.8125rem]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
