import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PublicAccount } from "@modules/account";
import type { SyncService, SyncStatus } from "@modules/sync";

interface UseSyncOptions {
  service: SyncService | null;
  signedIn: boolean;
  account: PublicAccount | null;
  syncEnabled: boolean;
  onAccountSynced?: (patch: { lastSyncedAt: string; cloudUserId?: string | null }) => void;
}

type Activity =
  | { kind: "idle" }
  | { kind: "syncing" }
  | { kind: "synced"; at: string }
  | { kind: "failed"; message: string };

function resolveStatus(
  activity: Activity,
  signedIn: boolean,
  syncEnabled: boolean,
  online: boolean,
): SyncStatus {
  if (activity.kind === "syncing") return "syncing";
  if (activity.kind === "failed") return "failed";
  if (!signedIn || !syncEnabled) return "local-only";
  if (!online) return "offline";
  if (activity.kind === "synced") return "synced";
  return "local-only";
}

export function useSync({
  service,
  signedIn,
  account,
  syncEnabled,
  onAccountSynced,
}: UseSyncOptions) {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [activity, setActivity] = useState<Activity>({ kind: "idle" });
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const prevEnabled = useRef(syncEnabled);
  const onSyncedRef = useRef(onAccountSynced);

  useEffect(() => {
    onSyncedRef.current = onAccountSynced;
  }, [onAccountSynced]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const status = useMemo(
    () => resolveStatus(activity, signedIn, syncEnabled, online),
    [activity, signedIn, syncEnabled, online],
  );

  const lastSyncedAt =
    activity.kind === "synced" ? activity.at : (account?.lastSyncedAt ?? null);

  const message = activity.kind === "failed" ? activity.message : null;

  const runSync = useCallback(
    async (password?: string) => {
      if (!service || !account || !signedIn) {
        setActivity({ kind: "idle" });
        return;
      }
      if (!syncEnabled) {
        setActivity({ kind: "idle" });
        return;
      }
      if (!online) {
        setActivity({ kind: "idle" });
        return;
      }

      setBusy(true);
      setActivity({ kind: "syncing" });
      setLinkError(null);

      try {
        const result = await service.run({
          account,
          syncEnabled,
          online,
          password,
        });

        if (result.kind === "needs-password") {
          setActivity({ kind: "idle" });
          setLinkOpen(true);
          return;
        }

        if (result.kind === "skipped") {
          setActivity({ kind: "idle" });
          return;
        }

        if (result.kind === "failed") {
          setActivity({ kind: "failed", message: result.message });
          setLinkError(result.message);
          return;
        }

        setLinkOpen(false);
        setActivity({ kind: "synced", at: result.lastSyncedAt });
        onSyncedRef.current?.({
          lastSyncedAt: result.lastSyncedAt,
          cloudUserId: result.cloudUserId,
        });
      } catch (error) {
        const failMessage = error instanceof Error ? error.message : "Sync failed";
        setActivity({ kind: "failed", message: failMessage });
        setLinkError(failMessage);
      } finally {
        setBusy(false);
      }
    },
    [account, online, service, signedIn, syncEnabled],
  );

  const syncNow = useCallback(() => {
    void runSync();
  }, [runSync]);

  const confirmLink = useCallback(
    (password: string) => {
      void runSync(password);
    },
    [runSync],
  );

  const closeLink = useCallback(() => {
    if (busy) return;
    setLinkOpen(false);
    setLinkError(null);
  }, [busy]);

  useEffect(() => {
    const wasEnabled = prevEnabled.current;
    prevEnabled.current = syncEnabled;
    if (!wasEnabled && syncEnabled && signedIn && service && account) {
      void runSync();
    }
  }, [syncEnabled, signedIn, service, account, runSync]);

  return {
    status,
    lastSyncedAt,
    message,
    busy,
    linkOpen,
    linkError,
    syncNow,
    confirmLink,
    closeLink,
    retry: syncNow,
  };
}
