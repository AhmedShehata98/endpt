import { useState } from "react";
import { Button, Input, SecretInput } from "@/components";
import { AuthScreenLayout } from "@/views/auth/AuthScreenLayout";

interface SignInViewProps {
  onSignIn: (email: string) => void;
  onGoSignUp: () => void;
  onContinueWithoutAccount: () => void;
}

export function SignInView({ onSignIn, onGoSignUp, onContinueWithoutAccount }: SignInViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <AuthScreenLayout
      title="Sign in"
      description="Continue with your Endpt account. Works offline after sign-in; cloud sync is optional."
      onContinueWithoutAccount={onContinueWithoutAccount}
      footer={
        <>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-default" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-bg-surface px-2.5 font-mono text-[0.625rem] tracking-wider text-text-subtle uppercase">
                or
              </span>
            </div>
          </div>
          <p className="text-center text-[0.8125rem] text-text-secondary">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              className="font-medium text-accent hover:underline"
              onClick={onGoSignUp}
            >
              Create an account
            </button>
          </p>
          <div className="mt-6 flex flex-wrap gap-1.5 border-t border-border-subtle pt-4 font-mono text-[0.6875rem] text-text-secondary">
            <span className="rounded border border-border-default bg-bg-app px-2 py-1">
              Local-first
            </span>
            <span className="rounded border border-border-default bg-bg-app px-2 py-1">
              Encrypted at rest
            </span>
            <span className="rounded border border-border-default bg-bg-app px-2 py-1">
              Optional sync
            </span>
          </div>
        </>
      }
    >
      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSignIn(email || "developer@example.com");
        }}
      >
        <div>
          <label htmlFor="sign-in-email" className="mb-1.5 block text-[0.75rem] font-medium">
            Email <span className="text-error">*</span>
          </label>
          <Input
            id="sign-in-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="developer@example.com"
            autoComplete="email"
          />
        </div>
        <div>
          <label htmlFor="sign-in-password" className="mb-1.5 block text-[0.75rem] font-medium">
            Password <span className="text-error">*</span>
          </label>
          <SecretInput
            id="sign-in-password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••••••"
            aria-label="Password"
          />
        </div>
        <Button type="submit" variant="primary" className="h-9 w-full">
          Sign in
        </Button>
      </form>
    </AuthScreenLayout>
  );
}
