/**
 * TODO DELETED — migrated to TanStack Router. Remove this file when safe.
 * Live entry: `src/main.tsx` → route tree.
 * - shell / shared state: `src/routes/application/route.tsx`
 * - workspace: `src/routes/application/workspace.tsx`
 * - collections: `src/routes/application/collections.tsx`
 * - environment: `src/routes/application/environment.tsx`
 * - settings: `src/routes/application/settings.tsx`
 * - auth: `src/routes/sign-in.tsx`, `src/routes/sign-up.tsx`
 */
export default function App() {
  return null;
}

/*
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AccountService } from "@modules/account";
import type { ProjectService } from "@modules/project";
import type { AppRepositories } from "@modules/persistence";
import type { SyncService, SyncStatus } from "@modules/sync";
import {
  createAccountService,
  createProjectService,
  createSyncService,
  getAppRepositories,
} from "@/app/composition";
import { isAuthView, type AppView } from "@/app/navigation";
import { Toast } from "@/components/Toast";
import { useCollapsedSidebar } from "@/hooks/useCollapsedSidebar";
import { useEnvironmentVariables } from "@/hooks/useEnvironmentVariables";
import { useProjects } from "@/hooks/useProjects";
import { useSession } from "@/hooks/useSession";
import { useSync } from "@/hooks/useSync";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useWorkspaceDraft } from "@/hooks/useWorkspaceDraft";
import { useWorkspaceSend } from "@/hooks/useWorkspaceSend";
import { AppHeader } from "@/shell/AppHeader";
import { Sidebar } from "@/shell/Sidebar";
import { CloudLinkDialog } from "@/views/CloudLinkDialog";
import { CollectionsView } from "@/views/CollectionsView";
import { EnvironmentView } from "@/views/EnvironmentView";
import { ResponseFullscreen } from "@/views/ResponseFullscreen";
import { SaveRequestDialog } from "@/views/SaveRequestDialog";
import { SettingsView } from "@/views/SettingsView";
import { SignInView } from "@/views/SignInView";
import { SignUpView } from "@/views/SignUpView";
import { VariablesDrawer } from "@/views/VariablesDrawer";
import { WorkspaceView } from "@/views/WorkspaceView";

const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  "local-only": "Local only",
  offline: "Offline",
  syncing: "Syncing…",
  synced: "Synced",
  failed: "Sync failed",
};

export default function App() {
  const [repos, setRepos] = useState<AppRepositories | null>(null);
  const [accountService, setAccountService] = useState<AccountService | null>(null);
  const [projectService, setProjectService] = useState<ProjectService | null>(null);
  const [syncService, setSyncService] = useState<SyncService | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [view, setView] = useState<AppView>("workspace");
  const [variablesOpen, setVariablesOpen] = useState(false);
  const [variablesFocusKey, setVariablesFocusKey] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const fullscreenTriggerRef = useRef<HTMLButtonElement>(null);

  const onPersistError = useCallback((message: string) => {
    setPersistError(message);
  }, []);

  const collapsed = useCollapsedSidebar();
  const session = useSession({ service: accountService });
  const { preferences, updatePreferences } = useUserPreferences({
    signedIn: session.signedIn,
    userId: session.account?.id ?? null,
    initialSettings: session.settings,
    repository: repos?.userSettings ?? null,
    onPersistError,
  });
  const {
    draft,
    setDraft,
    startNewRequest,
    openSavedRequest,
    bindSavedRequest,
    persistSavedIfBound,
    activeSavedRequestId,
    breadcrumb,
    ready: draftReady,
    saveState,
  } = useWorkspaceDraft({
    defaultMethod: preferences.defaultHttpMethod,
    repository: repos?.adHocRequests ?? null,
    projectService,
    onPersistError,
  });
  const { variables, setVariables, ready: envReady } = useEnvironmentVariables({
    repository: repos?.environmentVariables ?? null,
    onPersistError,
  });
  const projects = useProjects({
    service: projectService,
    signedIn: session.signedIn,
    userId: session.account?.id ?? null,
    onError: onPersistError,
  });
  const patchAccount = session.patchAccount;
  const refreshProjects = projects.refresh;
  const onAccountSynced = useCallback(
    (patch: { lastSyncedAt: string; cloudUserId?: string | null }) => {
      patchAccount(patch);
      void refreshProjects();
    },
    [patchAccount, refreshProjects],
  );
  const sync = useSync({
    service: syncService,
    signedIn: session.signedIn,
    account: session.account,
    syncEnabled: preferences.syncEnabled,
    onAccountSynced,
  });
  const {
    send,
    sendDraft,
    responseForView,
    showPreviousResponse,
    envValues,
    unresolvedForDraft,
  } = useWorkspaceSend({ variables });

  const storageReady = draftReady && envReady;
  const unresolvedCount = useMemo(
    () => unresolvedForDraft(draft).length,
    [draft, unresolvedForDraft],
  );

  useEffect(() => {
    let cancelled = false;
    void getAppRepositories()
      .then((created) => {
        if (cancelled) return;
        setRepos(created);
        setAccountService(createAccountService(created));
        setProjectService(createProjectService(created));
        setSyncService(createSyncService(created));
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

  useEffect(() => {
    if (!persistError) return;
    const timer = window.setTimeout(() => setPersistError(null), 5000);
    return () => window.clearTimeout(timer);
  }, [persistError]);

  useEffect(() => {
    if (!copyToast) return;
    const timer = window.setTimeout(() => setCopyToast(null), 2000);
    return () => window.clearTimeout(timer);
  }, [copyToast]);

  useEffect(() => {
    if (!saveToast) return;
    const timer = window.setTimeout(() => setSaveToast(null), 2000);
    return () => window.clearTimeout(timer);
  }, [saveToast]);

  const goWorkspace = useCallback(() => {
    setView("workspace");
  }, []);

  const setWrapLines = useCallback(
    (wrapResponseLines: boolean) => {
      updatePreferences({ wrapResponseLines });
    },
    [updatePreferences],
  );

  const handleCopyResult = useCallback((ok: boolean) => {
    setCopyToast(ok ? "Copied" : "Copy failed");
  }, []);

  const closeFullscreen = useCallback(() => {
    setFullscreenOpen(false);
    queueMicrotask(() => fullscreenTriggerRef.current?.focus());
  }, []);

  const createNewRequest = useCallback(() => {
    if (!storageReady) return;
    startNewRequest();
    setView("workspace");
  }, [startNewRequest, storageReady]);

  const sendCurrentDraft = useCallback(() => {
    if (!storageReady || send.status === "sending") return;
    void sendDraft(draft);
  }, [draft, send.status, sendDraft, storageReady]);

  const openVariables = useCallback((focusKey?: string) => {
    setVariablesFocusKey(typeof focusKey === "string" ? focusKey : null);
    setVariablesOpen(true);
  }, []);

  const closeVariables = useCallback(() => {
    setVariablesOpen(false);
    setVariablesFocusKey(null);
  }, []);

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

  const handleSignOut = useCallback(() => {
    void session.signOut();
  }, [session]);

  const handleSaveRequestClick = useCallback(() => {
    if (!storageReady) return;
    if (activeSavedRequestId) {
      void persistSavedIfBound().then((ok) => {
        if (ok) setSaveToast("Request saved");
      });
      return;
    }
    setSaveDialogOpen(true);
  }, [activeSavedRequestId, persistSavedIfBound, storageReady]);

  const handleSaveDialogSave = useCallback(
    async (collectionId: string, name: string) => {
      const result = await projects.saveRequest(collectionId, draft, name);
      if (result?.status === "ok" && result.request) {
        await bindSavedRequest(result.request);
        setSaveToast("Request saved");
      }
      return result;
    },
    [bindSavedRequest, draft, projects],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "n") {
        event.preventDefault();
        createNewRequest();
        return;
      }
      if (meta && event.key === "Enter") {
        event.preventDefault();
        sendCurrentDraft();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [createNewRequest, sendCurrentDraft]);

  if (bootError) {
    return (
      <div className="flex h-full items-center justify-center bg-bg-app p-6 text-text-primary">
        <Toast message={bootError} tone="error" />
      </div>
    );
  }

  if (isAuthView(view)) {
    return view === "sign-in" ? (
      <SignInView
        onSignIn={handleSignIn}
        onGoSignUp={() => {
          session.setError(null);
          setView("sign-up");
        }}
        onContinueWithoutAccount={goWorkspace}
        busy={session.busy}
        error={session.error}
      />
    ) : (
      <SignUpView
        onSignUp={handleSignUp}
        onGoSignIn={() => {
          session.setError(null);
          setView("sign-in");
        }}
        onContinueWithoutAccount={goWorkspace}
        busy={session.busy}
        error={session.error}
      />
    );
  }

  const headerSignedIn = session.ready ? session.signedIn : false;

  return (
    <div className="flex h-full min-h-0 bg-bg-app text-text-primary">
      <Sidebar
        activeView={view}
        collapsed={collapsed}
        onNavigate={setView}
        onNewRequest={createNewRequest}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          requestName={draft.name ?? "Untitled Request"}
          breadcrumb={breadcrumb}
          saveState={saveState}
          unresolvedCount={unresolvedCount}
          syncStatus={sync.status}
          signedIn={headerSignedIn}
          displayName={session.displayName}
          onSaveRequest={handleSaveRequestClick}
          onOpenVariables={openVariables}
          onSignIn={() => {
            session.setError(null);
            setView("sign-in");
          }}
          onSignOut={handleSignOut}
          onRetrySync={sync.retry}
        />

        <main className="min-h-0 flex-1 overflow-hidden">
          {!storageReady ? (
            <div className="flex h-full items-center justify-center text-sm text-text-secondary">
              Loading local data…
            </div>
          ) : (
            <>
              {view === "workspace" && (
                <WorkspaceView
                  draft={draft}
                  onDraftChange={setDraft}
                  send={send}
                  response={responseForView}
                  showPreviousResponse={showPreviousResponse}
                  envValues={envValues}
                  wrapLines={preferences.wrapResponseLines}
                  onWrapLinesChange={setWrapLines}
                  onSend={sendCurrentDraft}
                  onFixVariable={(key) => openVariables(key)}
                  onOpenFullscreen={() => {
                    if (responseForView) setFullscreenOpen(true);
                  }}
                  onTryAgain={sendCurrentDraft}
                  onCopyResult={handleCopyResult}
                  fullscreenTriggerRef={fullscreenTriggerRef}
                />
              )}
              {view === "collections" && (
                <CollectionsView
                  signedIn={session.signedIn}
                  tree={projects.tree}
                  ready={projects.ready}
                  busy={projects.busy}
                  onSignIn={() => {
                    session.setError(null);
                    setView("sign-in");
                  }}
                  onOpenRequest={(id) => {
                    void openSavedRequest(id).then((ok) => {
                      if (ok) goWorkspace();
                    });
                  }}
                  onCreateProject={projects.createProject}
                  onRenameProject={projects.renameProject}
                  onDeleteProject={projects.deleteProject}
                  onCreateCollection={projects.createCollection}
                  onRenameCollection={projects.renameCollection}
                  onDeleteCollection={projects.deleteCollection}
                  onRenameRequest={projects.renameSavedRequest}
                  onDeleteRequest={projects.deleteSavedRequest}
                  onCountCascade={projects.countCascade}
                />
              )}
              {view === "environment" && (
                <EnvironmentView variables={variables} onVariablesChange={setVariables} />
              )}
              {view === "settings" && (
                <SettingsView
                  signedIn={session.signedIn}
                  displayName={session.displayName}
                  email={session.account?.email ?? null}
                  lastSyncedAt={sync.lastSyncedAt}
                  syncStatusLabel={
                    sync.message && sync.status === "failed"
                      ? `${SYNC_STATUS_LABELS[sync.status]} — ${sync.message}`
                      : SYNC_STATUS_LABELS[sync.status]
                  }
                  syncBusy={sync.busy}
                  preferences={preferences}
                  onPreferencesChange={updatePreferences}
                  onSyncNow={sync.syncNow}
                  onSignIn={() => {
                    session.setError(null);
                    setView("sign-in");
                  }}
                  onSignUp={() => {
                    session.setError(null);
                    setView("sign-up");
                  }}
                  onSignOut={handleSignOut}
                />
              )}
            </>
          )}
        </main>
      </div>

      <VariablesDrawer
        open={variablesOpen && storageReady}
        variables={variables}
        focusKey={variablesFocusKey}
        onApply={setVariables}
        onClose={closeVariables}
      />

      <SaveRequestDialog
        open={saveDialogOpen}
        signedIn={session.signedIn}
        draft={draft}
        tree={projects.tree}
        busy={projects.busy}
        onClose={() => setSaveDialogOpen(false)}
        onSignIn={() => {
          setSaveDialogOpen(false);
          session.setError(null);
          setView("sign-in");
        }}
        onCreateProject={projects.createProject}
        onCreateCollection={projects.createCollection}
        onSave={handleSaveDialogSave}
      />

      <CloudLinkDialog
        open={sync.linkOpen}
        email={session.account?.email ?? ""}
        busy={sync.busy}
        error={sync.linkError}
        onClose={sync.closeLink}
        onConfirm={sync.confirmLink}
      />

      {responseForView && (
        <ResponseFullscreen
          open={fullscreenOpen}
          response={responseForView}
          wrapLines={preferences.wrapResponseLines}
          onWrapLinesChange={setWrapLines}
          onCopyResult={handleCopyResult}
          onClose={closeFullscreen}
        />
      )}

      {persistError || copyToast || saveToast ? (
        <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {persistError ? <Toast message={persistError} tone="error" /> : null}
          {copyToast ? (
            <Toast
              message={copyToast}
              tone={copyToast === "Copied" ? "success" : "error"}
            />
          ) : null}
          {saveToast ? <Toast message={saveToast} tone="success" /> : null}
        </div>
      ) : null}
    </div>
  );
}
*/
