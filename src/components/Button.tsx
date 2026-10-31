import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "destructive";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-on hover:bg-accent-hover border-transparent shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
  secondary:
    "bg-bg-surface text-text-primary border-border-default hover:bg-bg-subtle",
  ghost:
    "bg-transparent text-text-secondary border-transparent hover:bg-bg-subtle hover:text-text-primary",
  destructive:
    "bg-error-subtle text-error border-transparent hover:bg-error hover:text-white",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    size = "md",
    className,
    leftIcon,
    rightIcon,
    children,
    type = "button",
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-7 px-2 text-xs" : "h-8 px-3 text-[0.8125rem]",
        variants[variant],
        className,
      )}
      {...props}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
});
