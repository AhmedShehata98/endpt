import { useEffect, useState } from "react";
import type { AccountService } from "@modules/account";
import { createAccountService, getAppRepositories } from "@/app/composition";
import { useSession } from "@/hooks/useSession";

export function useAccountSession() {
  const [accountService, setAccountService] = useState<AccountService | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getAppRepositories()
      .then((repos) => {
        if (cancelled) return;
        setAccountService(createAccountService(repos));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "Failed to open local storage";
        setBootError(message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const session = useSession({ service: accountService });
  return { session, bootError };
}
