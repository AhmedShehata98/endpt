import { useCallback, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CgSpinnerTwo } from "react-icons/cg";
import { VIEW_TO } from "@/app/navigation";
import { Button, Input, SecretInput } from "@/components";
import { Toast } from "@/components/Toast";
import { useAccountSession } from "@/hooks/useAccountSession";
import { AuthScreenLayout } from "@/views/auth/AuthScreenLayout";

export const Route = createFileRoute("/sign-up")({
  component: SignUpRoute,
});

function SignUpRoute() {
  const navigate = useNavigate();
  const { session, bootError } = useAccountSession();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");

  const goWorkspace = useCallback(() => {
    void navigate({ to: VIEW_TO.workspace });
  }, [navigate]);

  const goSignIn = useCallback(() => {
    session.setError(null);
    void navigate({ to: VIEW_TO["sign-in"] });
  }, [navigate, session]);

  const handleSignUp = useCallback(
    async (input: { email: string; password: string; displayName: string }) => {
      const result = await session.signUp(input);
      if (result.status === "ok") {
        goWorkspace();
        return true;
      }
      return false;
    },
    [goWorkspace, session],
  );

  if (bootError) {
    return (
      <div className="flex h-full items-center justify-center bg-bg-app p-6 text-text-primary">
        <Toast message={bootError} tone="error" />
      </div>
    );
  }

  const busy = session.busy;
  const error = session.error;

  return (
    <AuthScreenLayout
      title="Create account"
      description="Local-first account. You can keep working offline; cloud sync stays optional."
      onContinueWithoutAccount={goWorkspace}
      footer={
        <p className="mt-6 text-center text-[0.8125rem] text-text-secondary">
          Already have an account?{" "}
          <button
            type="button"
            className="font-medium text-accent hover:underline"
            onClick={goSignIn}
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
          void handleSignUp({ email, password, displayName });
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
          {busy ? (
            <>
              <p>Creating account…</p>
              <CgSpinnerTwo className="animate-spin" />
            </>
          ) : (
            <p>Create account</p>
          )}
        </Button>
      </form>
    </AuthScreenLayout>
  );
}
