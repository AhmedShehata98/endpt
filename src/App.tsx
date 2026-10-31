import { useCallback, useEffect, useState } from "react";
import type { AppRepositories } from "@modules/persistence";
import type { SyncStatus } from "@modules/sync";
import { getAppRepositories } from "@/app/composition";
import { isAuthView, type AppView } from "@/app/navigation";
import { MOCK_RESPONSE } from "@/app/mock-data";
import { useCollapsedSidebar } from "@/hooks/useCollapsedSidebar";
import { useEnvironmentVariables } from "@/hooks/useEnvironmentVariables";
import { useSession } from "@/hooks/useSession";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useWorkspaceDraft } from "@/hooks/useWorkspaceDraft";
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
  const [view, setView] = useState<AppView>("workspace");
  const [variablesOpen, setVariablesOpen] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [response] = useState(MOCK_RESPONSE);

  const collapsed = useCollapsedSidebar();
  const session = useSession();
  const { preferences, updatePreferences, setSyncEnabled } = useUserPreferences();
  const { draft, setDraft, startNewRequest, openSavedRequest } = useWorkspaceDraft(
    preferences.defaultHttpMethod,
    repos?.adHocRequests ?? null,
  );
  const { variables, setVariables } = useEnvironmentVariables(
    repos?.environmentVariables ?? null,
  );

  useEffect(() => {
    let cancelled = false;
    void getAppRepositories().then((created) => {
      if (!cancelled) setRepos(created);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const goWorkspace = useCallback(() => {
    setView("workspace");
  }, []);

  const createNewRequest = useCallback(() => {
    startNewRequest();
    setView("workspace");
  }, [startNewRequest]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "n") {
        event.preventDefault();
        createNewRequest();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [createNewRequest]);

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
          unresolvedCount={0}
          syncStatus={PHASE0_SYNC_STATUS}
          signedIn={session.signedIn}
          displayName={session.displayName}
          onOpenVariables={() => setVariablesOpen(true)}
          onSignIn={() => setView("sign-in")}
          onSignOut={() => {
            session.signOut();
            setSyncEnabled(false);
          }}
        />

        <main className="min-h-0 flex-1 overflow-hidden">
          {view === "workspace" && (
            <WorkspaceView
              draft={draft}
              onDraftChange={setDraft}
              response={response}
              wrapLines={preferences.wrapResponseLines}
              onOpenFullscreen={() => setFullscreenOpen(true)}
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
        </main>
      </div>

      <VariablesDrawer
        open={variablesOpen}
        variables={variables}
        onClose={() => setVariablesOpen(false)}
      />

      <ResponseFullscreen
        open={fullscreenOpen}
        response={response}
        wrapLines={preferences.wrapResponseLines}
        onWrapLinesChange={(wrapResponseLines) => updatePreferences({ wrapResponseLines })}
        onClose={() => setFullscreenOpen(false)}
      />
    </div>
  );
}
