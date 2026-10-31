import type { ReactNode } from "react";
import { LogoMark } from "@/shell/LogoMark";

interface AuthScreenLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
  onContinueWithoutAccount: () => void;
}

export function AuthScreenLayout({
  title,
  description,
  children,
  footer,
  onContinueWithoutAccount,
}: AuthScreenLayoutProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-bg-app p-6">
      <div className="w-full max-w-[430px] rounded-xl border border-border-default bg-bg-surface p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="mb-6 flex items-center gap-2.5">
          <LogoMark className="size-9" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-semibold tracking-tight text-text-primary">Endpt</span>
              <span className="rounded bg-bg-active px-1.5 py-0.5 font-mono text-[0.6875rem] text-text-muted">
                v0.1
              </span>
            </div>
            <span className="font-mono text-[0.6875rem] text-text-subtle">Desktop Runtime</span>
          </div>
        </div>

        <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
        <p className="mt-1 text-[0.8125rem] text-text-muted">{description}</p>

        {children}

        {footer}
      </div>

      <button
        type="button"
        className="mt-4 rounded-md px-3 py-1.5 font-mono text-[0.75rem] text-text-secondary hover:bg-bg-subtle hover:text-text-primary"
        onClick={onContinueWithoutAccount}
      >
        Continue without account
      </button>
    </div>
  );
}
