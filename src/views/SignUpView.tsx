/**
 * TODO DELETED — extracted to `src/routes/sign-up.tsx`. Remove this file when safe.
 */
export function SignUpView() {
  return null;
}

/*
import { useState } from "react";
import { Button, Input, SecretInput } from "@/components";
import { AuthScreenLayout } from "@/views/auth/AuthScreenLayout";
import { CgSpinnerTwo } from "react-icons/cg";

interface SignUpViewProps {
  onSignUp: (input: {
    email: string;
    password: string;
    displayName: string;
  }) => Promise<boolean>;
  onGoSignIn: () => void;
  onContinueWithoutAccount: () => void;
  busy?: boolean;
  error?: string | null;
}

export function SignUpView({
  onSignUp,
  onGoSignIn,
  onContinueWithoutAccount,
  busy = false,
  error = null,
}: SignUpViewProps) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");

  return (
    <AuthScreenLayout
      title="Create account"
      description="Local-first account. You can keep working offline; cloud sync stays optional."
      onContinueWithoutAccount={onContinueWithoutAccount}
      footer={
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
      }
    >
      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void onSignUp({ email, password, displayName });
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
            disabled={busy}
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
            placeholder="you@example.com"
            autoComplete="email"
            disabled={busy}
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
            <p>Creating account…</p>
            <CgSpinnerTwo className="animate-spin" />
          </> 
          : <p>Create account</p>
          }
        </Button>
      </form>
    </AuthScreenLayout>
  );
}
*/
