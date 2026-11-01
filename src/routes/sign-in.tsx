import { useCallback, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CgSpinnerTwo } from "react-icons/cg";
import { VIEW_TO } from "@/app/navigation";
import { Button, Input, SecretInput } from "@/components";
import { Toast } from "@/components/Toast";
import { useAccountSession } from "@/hooks/useAccountSession";
import { AuthScreenLayout } from "@/views/auth/AuthScreenLayout";

export const Route = createFileRoute("/sign-in")({
  component: SignInRoute,
});

function SignInRoute() {
  const navigate = useNavigate();
  const { session, bootError } = useAccountSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const goWorkspace = useCallback(() => {
    void navigate({ to: VIEW_TO.workspace });
  }, [navigate]);

  const goSignUp = useCallback(() => {
    session.setError(null);
    void navigate({ to: VIEW_TO["sign-up"] });
  }, [navigate, session]);

  const handleSignIn = useCallback(
    async (input: { email: string; password: string }) => {
      const result = await session.signIn(input);
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
      title="Sign in"
      description="Continue with your Endpt account. Works offline after sign-in; cloud sync is optional."
      onContinueWithoutAccount={goWorkspace}
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
              onClick={goSignUp}
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
          void handleSignIn({ email, password });
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
          {busy ? (
            <>
              <p>Signing in…</p>
              <CgSpinnerTwo className="animate-spin" />
            </>
          ) : (
            <p>Sign in</p>
          )}
        </Button>
      </form>
    </AuthScreenLayout>
  );
}
