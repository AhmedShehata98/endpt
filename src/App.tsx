import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppRepositories } from "@modules/persistence";
import type { SyncStatus } from "@modules/sync";
import { getAppRepositories } from "@/app/composition";
import { isAuthView, type AppView } from "@/app/navigation";
import { Toast } from "@/components/Toast";
import { useCollapsedSidebar } from "@/hooks/useCollapsedSidebar";
import { useEnvironmentVariables } from "@/hooks/useEnvironmentVariables";
import { useSession } from "@/hooks/useSession";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useWorkspaceDraft } from "@/hooks/useWorkspaceDraft";
import { useWorkspaceSend } from "@/hooks/useWorkspaceSend";
import { AppHeader } from "@/shell/AppHeader";
import { Sidebar } from "@/shell/Sidebar";
import { CollectionsView } from "@/views/CollectionsView";
import { EnvironmentView } from "@/views/EnvironmentView";
import { ResponseFullscreen } from "@/views/ResponseFullscreen";
import { SettingsView } from "@/views/SettingsView";
import { SignInView } from "@/views/SignInView";
import { SignUpView } from "@/views/SignUpView";
import { VariablesDrawer } from "@/views/VariablesDrawer";
import { WorkspaceView } from "@/views/WorkspaceView";

const PHASE0_SYNC_STATUS: SyncStatus = "local-only";

export default function App() {
  const [repos, setRepos] = useState<AppRepositories | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [view, setView] = useState<AppView>("workspace");
  const [variablesOpen, setVariablesOpen] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  const onPersistError = useCallback((message: string) => {
    setPersistError(message);
  }, []);

  const collapsed = useCollapsedSidebar();
  const session = useSession();
  const { preferences, updatePreferences, setSyncEnabled } = useUserPreferences();
  const {
    draft,
    setDraft,
    startNewRequest,
    openSavedRequest,
    ready: draftReady,
    saveState,
  } = useWorkspaceDraft({
    defaultMethod: preferences.defaultHttpMethod,
    repository: repos?.adHocRequests ?? null,
    onPersistError,
  });
  const { variables, setVariables, ready: envReady } = useEnvironmentVariables({
    repository: repos?.environmentVariables ?? null,
    onPersistError,
  });
  const {
    send,
    sendDraft,
    responseForView,
    showPreviousResponse,
    definedKeys,
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
        if (!cancelled) setRepos(created);
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

  const goWorkspace = useCallback(() => {
    setView("workspace");
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

  const openVariables = useCallback(() => {
    setVariablesOpen(true);
  }, []);

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
        onSignIn={(email) => {
          session.signIn(email);
          goWorkspace();
        }}
        onGoSignUp={() => setView("sign-up")}
        onContinueWithoutAccount={goWorkspace}
      />
    ) : (
      <SignUpView
        onSignUp={(email, name) => {
          session.signUp(email, name);
          goWorkspace();
        }}
        onGoSignIn={() => setView("sign-in")}
        onContinueWithoutAccount={goWorkspace}
      />
    );
  }

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
          breadcrumb={null}
          saveState={saveState}
          unresolvedCount={unresolvedCount}
          syncStatus={PHASE0_SYNC_STATUS}
          signedIn={session.signedIn}
          displayName={session.displayName}
          onOpenVariables={openVariables}
          onSignIn={() => setView("sign-in")}
          onSignOut={() => {
            session.signOut();
            setSyncEnabled(false);
          }}
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
                  definedKeys={definedKeys}
                  wrapLines={preferences.wrapResponseLines}
                  onSend={sendCurrentDraft}
                  onFixVariable={openVariables}
                  onOpenFullscreen={() => {
                    if (responseForView) setFullscreenOpen(true);
                  }}
                  onTryAgain={sendCurrentDraft}
                />
              )}
              {view === "collections" && (
                <CollectionsView
                  signedIn={session.signedIn}
                  onSignIn={() => setView("sign-in")}
                  onOpenRequest={(name, method) => {
                    openSavedRequest(name, method);
                    goWorkspace();
                  }}
                />
              )}
              {view === "environment" && (
                <EnvironmentView variables={variables} onVariablesChange={setVariables} />
              )}
              {view === "settings" && (
                <SettingsView
                  signedIn={session.signedIn}
                  preferences={preferences}
                  onPreferencesChange={updatePreferences}
                  onSignIn={() => setView("sign-in")}
                />
              )}
            </>
          )}
        </main>
      </div>

      <VariablesDrawer
        open={variablesOpen && storageReady}
        variables={variables}
        onClose={() => setVariablesOpen(false)}
      />

      {responseForView && (
        <ResponseFullscreen
          open={fullscreenOpen}
          response={responseForView}
          wrapLines={preferences.wrapResponseLines}
          onWrapLinesChange={(wrapResponseLines) => updatePreferences({ wrapResponseLines })}
          onClose={() => setFullscreenOpen(false)}
        />
      )}

      {persistError ? (
        <div className="pointer-events-none fixed bottom-4 right-4 z-50">
          <Toast message={persistError} tone="error" />
        </div>
      ) : null}
    </div>
  );
}
