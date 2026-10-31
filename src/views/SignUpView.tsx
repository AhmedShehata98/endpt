import { useState } from "react";
import { Button, Input, SecretInput } from "@/components";
import { LogoMark } from "@/shell/LogoMark";

interface SignUpViewProps {
  onSignUp: (email: string, displayName: string) => void;
  onGoSignIn: () => void;
  onContinueWithoutAccount: () => void;
}

export function SignUpView({ onSignUp, onGoSignIn, onContinueWithoutAccount }: SignUpViewProps) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="flex h-full flex-col items-center justify-center bg-bg-app p-6">
      <div className="w-full max-w-[430px] rounded-xl border border-border-default bg-bg-surface p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="mb-6 flex items-center gap-2.5">
          <LogoMark className="size-9" />
          <div>
            <span className="text-lg font-semibold tracking-tight text-text-primary">Endpt</span>
            <span className="mt-0.5 block font-mono text-[0.6875rem] text-text-subtle">
              Desktop Runtime
            </span>
          </div>
        </div>

        <h1 className="text-xl font-semibold text-text-primary">Create account</h1>
        <p className="mt-1 text-[0.8125rem] text-text-muted">
          Local-first account. You can keep working offline; cloud sync stays optional.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSignUp(email || "developer@example.com", displayName || "Developer");
          }}
        >
          <div>
            <label htmlFor="sign-up-name" className="mb-1.5 block text-[0.75rem] font-medium">
              Display name
            </label>
            <Input
              id="sign-up-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Alex Chen"
              autoComplete="nickname"
            />
          </div>
          <div>
            <label htmlFor="sign-up-email" className="mb-1.5 block text-[0.75rem] font-medium">
              Email <span className="text-error">*</span>
            </label>
            <Input
              id="sign-up-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="developer@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="sign-up-password" className="mb-1.5 block text-[0.75rem] font-medium">
              Password <span className="text-error">*</span>
            </label>
            <SecretInput
              id="sign-up-password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••••••"
              aria-label="Password"
            />
          </div>
          <Button type="submit" variant="primary" className="h-9 w-full">
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-[0.8125rem] text-text-secondary">
          Already have an account?{" "}
          <button
            type="button"
            className="font-medium text-accent hover:underline"
            onClick={onGoSignIn}
          >
            Sign in
          </button>
        </p>
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
