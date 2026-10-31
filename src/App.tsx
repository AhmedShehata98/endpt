import { useEffect, useState } from "react";
import type { ThemePreference } from "@modules/account";
import { DEFAULT_USER_SETTINGS } from "@modules/account";
import { createEmptyDraft, type HttpMethod, type RequestDraft } from "@modules/request";
import type { ResponseView } from "@modules/response";
import type { SyncStatus } from "@modules/sync";
import { isAuthView, type AppView } from "@/app/navigation";
import { MOCK_DRAFT, MOCK_RESPONSE } from "@/app/mock-data";
import { applyTheme } from "@/lib/theme";
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

function useCollapsedSidebar(): boolean {
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 1280,
  );

  useEffect(() => {
    const onResize = () => setCollapsed(window.innerWidth < 1280);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return collapsed;
}

export default function App() {
  const [view, setView] = useState<AppView>("workspace");
  const [signedIn, setSignedIn] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemePreference>(DEFAULT_USER_SETTINGS.theme);
  const [defaultMethod, setDefaultMethod] = useState<HttpMethod>(
    DEFAULT_USER_SETTINGS.defaultHttpMethod,
  );
  const [wrapLines, setWrapLines] = useState(DEFAULT_USER_SETTINGS.wrapResponseLines);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [draft, setDraft] = useState<RequestDraft>(MOCK_DRAFT);
  const [response] = useState<ResponseView | null>(MOCK_RESPONSE);
  const [variablesOpen, setVariablesOpen] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const collapsed = useCollapsedSidebar();

  const syncStatus: SyncStatus = signedIn && syncEnabled ? "local-only" : "local-only";

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setDraft(createEmptyDraft(defaultMethod));
        setView("workspace");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [defaultMethod]);

  if (isAuthView(view)) {
    return view === "sign-in" ? (
      <SignInView
        onSignIn={(email) => {
          setSignedIn(true);
          setDisplayName(email.split("@")[0] ?? "User");
          setView("workspace");
        }}
        onGoSignUp={() => setView("sign-up")}
        onContinueWithoutAccount={() => setView("workspace")}
      />
    ) : (
      <SignUpView
        onSignUp={(email, name) => {
          setSignedIn(true);
          setDisplayName(name || email.split("@")[0] || "User");
          setView("workspace");
        }}
        onGoSignIn={() => setView("sign-in")}
        onContinueWithoutAccount={() => setView("workspace")}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 bg-bg-app text-text-primary">
      <Sidebar
        activeView={view}
        collapsed={collapsed}
        onNavigate={setView}
        onNewRequest={() => {
          setDraft(createEmptyDraft(defaultMethod));
          setView("workspace");
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          requestName={draft.name ?? "Untitled Request"}
          breadcrumb={null}
          unresolvedCount={1}
          syncStatus={syncStatus}
          signedIn={signedIn}
          displayName={displayName}
          onOpenVariables={() => setVariablesOpen(true)}
          onSignIn={() => setView("sign-in")}
          onSignOut={() => {
            setSignedIn(false);
            setDisplayName(null);
            setSyncEnabled(false);
          }}
        />

        <main className="min-h-0 flex-1 overflow-hidden">
          {view === "workspace" && (
            <WorkspaceView
              draft={draft}
              onDraftChange={setDraft}
              response={response}
              onOpenFullscreen={() => setFullscreenOpen(true)}
            />
          )}
          {view === "collections" && (
            <CollectionsView
              signedIn={signedIn}
              onSignIn={() => setView("sign-in")}
              onOpenRequest={(name, method) => {
                setDraft({
                  ...createEmptyDraft(method),
                  name,
                  url: "{{baseUrl}}/",
                });
                setView("workspace");
              }}
            />
          )}
          {view === "environment" && <EnvironmentView />}
          {view === "settings" && (
            <SettingsView
              signedIn={signedIn}
              theme={theme}
              defaultMethod={defaultMethod}
              wrapLines={wrapLines}
              syncEnabled={syncEnabled}
              onThemeChange={setTheme}
              onDefaultMethodChange={setDefaultMethod}
              onWrapLinesChange={setWrapLines}
              onSyncEnabledChange={setSyncEnabled}
              onSignIn={() => setView("sign-in")}
            />
          )}
        </main>
      </div>

      <VariablesDrawer open={variablesOpen} onClose={() => setVariablesOpen(false)} />

      {response && (
        <ResponseFullscreen
          open={fullscreenOpen}
          response={response}
          wrapLines={wrapLines}
          onWrapLinesChange={setWrapLines}
          onClose={() => setFullscreenOpen(false)}
        />
      )}
    </div>
  );
}
