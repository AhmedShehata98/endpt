import { useCallback, useEffect, useState } from "react";
import type {
  AccountService,
  AuthResult,
  PublicAccount,
  UserSettings,
} from "@modules/account";

export function displayNameFromEmail(email: string, preferredName?: string | null): string {
  if (preferredName?.trim()) return preferredName.trim();
  return email.split("@")[0] || "User";
}

interface UseSessionOptions {
  service: AccountService | null;
}

export function useSession({ service }: UseSessionOptions) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [account, setAccount] = useState<PublicAccount | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      if (!service) {
        if (!cancelled) {
          setSignedIn(false);
          setAccount(null);
          setSettings(null);
          setReady(false);
        }
        return;
      }

      try {
        const result = await service.restoreSession();
        if (cancelled) return;
        if (result.status === "signed-in") {
          setSignedIn(true);
          setAccount(result.account);
          setSettings(result.settings);
        } else {
          setSignedIn(false);
          setAccount(null);
          setSettings(null);
        }
        setReady(true);
      } catch {
        if (!cancelled) {
          setSignedIn(false);
          setAccount(null);
          setSettings(null);
          setReady(false);
        }
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, [service]);

  const applySuccess = useCallback((result: Extract<AuthResult, { status: "ok" }>) => {
    setSignedIn(true);
    setAccount(result.account);
    setSettings(result.settings);
    setError(null);
  }, []);

  const signIn = useCallback(
    async (input: { email: string; password: string }): Promise<AuthResult> => {
      if (!service) {
        return {
          status: "invalid",
          issues: [{ field: "email", message: "Account service is not ready." }],
        };
      }
      setBusy(true);
      setError(null);
      try {
        const result = await service.signIn(input);
        if (result.status === "ok") applySuccess(result);
        else if (result.status === "invalid-credentials") {
          setError("Invalid email or password.");
        } else if (result.status === "invalid") {
          setError(result.issues[0]?.message ?? "Check your credentials.");
        }
        return result;
      } finally {
        setBusy(false);
      }
    },
    [applySuccess, service],
  );

  const signUp = useCallback(
    async (input: {
      email: string;
      password: string;
      displayName?: string | null;
    }): Promise<AuthResult> => {
      if (!service) {
        return {
          status: "invalid",
          issues: [{ field: "email", message: "Account service is not ready." }],
        };
      }
      setBusy(true);
      setError(null);
      try {
        const result = await service.signUp(input);
        if (result.status === "ok") applySuccess(result);
        else if (result.status === "email-taken") {
          setError("An account with this email already exists.");
        } else if (result.status === "invalid") {
          setError(result.issues[0]?.message ?? "Check your details.");
        }
        return result;
      } finally {
        setBusy(false);
      }
    },
    [applySuccess, service],
  );

  const signOut = useCallback(async () => {
    if (service) await service.signOut();
    setSignedIn(false);
    setAccount(null);
    setSettings(null);
    setError(null);
  }, [service]);

  const patchAccount = useCallback(
    (patch: Partial<PublicAccount>) => {
      setAccount((prev) => (prev ? { ...prev, ...patch } : prev));
    },
    [],
  );

  const displayName = account
    ? displayNameFromEmail(account.email, account.displayName)
    : null;

  return {
    ready,
    signedIn,
    account,
    settings,
    displayName,
    busy,
    error,
    setError,
    signIn,
    signUp,
    signOut,
    patchAccount,
  };
}
