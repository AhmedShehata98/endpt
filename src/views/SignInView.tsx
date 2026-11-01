/**
 * TODO DELETED — extracted to `src/routes/sign-in.tsx`. Remove this file when safe.
 */
export function SignInView() {
  return null;
}

/*
import { useState } from "react";
import { Button, Input, SecretInput } from "@/components";
import { AuthScreenLayout } from "@/views/auth/AuthScreenLayout";
import { CgSpinnerTwo } from "react-icons/cg";

interface SignInViewProps {
  onSignIn: (input: { email: string; password: string }) => Promise<boolean>;
  onGoSignUp: () => void;
  onContinueWithoutAccount: () => void;
  busy?: boolean;
  error?: string | null;
}

export function SignInView({
  onSignIn,
  onGoSignUp,
  onContinueWithoutAccount,
  busy = false,
  error = null,
}: SignInViewProps) {
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
          void onSignIn({ email, password });
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
            placeholder="you@example.com"
            autoComplete="email"
            disabled={busy}
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
            disabled={busy}
          />
        </div>
        {error ? (
          <p className="text-[0.8125rem] text-error" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" variant="primary" className="h-9 w-full" disabled={busy}>
          {busy 
          ? <>
            <p>Signing in…</p>
            <CgSpinnerTwo className="animate-spin" />
          </> 
          : <p>Sign in</p>
          }
        </Button>
      </form>
    </AuthScreenLayout>
  );
}
*/
