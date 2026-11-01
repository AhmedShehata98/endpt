import type { ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import type { ThemePreference } from "@modules/account";
import { HTTP_METHODS, type HttpMethod } from "@modules/request";
import { Button, Select } from "@/components";
import { useApplicationContext } from "@/state-management/application-context";

export const Route = createFileRoute("/application/settings")({
  component: RouteComponent,
});

function RouteComponent() {
  const {
    signedIn,
    displayName,
    email,
    lastSyncedAt,
    syncStatusLabel,
    syncBusy,
    preferences,
    updatePreferences,
    syncNow,
    goSignIn,
    goSignUp,
    signOut,
  } = useApplicationContext();

  return (
    <div className="h-full overflow-auto bg-bg-app">
      <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Settings</h2>
          <p className="text-[0.8125rem] text-text-muted">
            Preferences apply immediately and persist with your account when signed in.
          </p>
        </div>

        <Section title="Account">
          {signedIn ? (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="truncate text-[0.8125rem] font-medium text-text-primary">
                  {displayName ?? "Account"}
                </p>
                {email ? (
                  <p className="truncate text-[0.75rem] text-text-secondary">{email}</p>
                ) : null}
              </div>
              <Button variant="secondary" size="sm" onClick={signOut}>
                Sign out
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[0.8125rem] text-text-secondary">
                Guests use defaults. Sign in to save preferences.
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={goSignIn}>
                  Sign in
                </Button>
                <Button variant="primary" size="sm" onClick={goSignUp}>
                  Sign up
                </Button>
              </div>
            </div>
          )}
        </Section>

        <Section title="Appearance">
          <label className="flex items-center justify-between gap-3 text-[0.8125rem]">
            <span className="text-text-secondary">Theme</span>
            <Select
              aria-label="Theme"
              value={preferences.theme}
              onChange={(e) =>
                updatePreferences({ theme: e.target.value as ThemePreference })
              }
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </Select>
          </label>
        </Section>

        <Section title="Request defaults">
          <label className="flex items-center justify-between gap-3 text-[0.8125rem]">
            <span className="text-text-secondary">Default method</span>
            <Select
              aria-label="Default HTTP method"
              value={preferences.defaultHttpMethod}
              onChange={(e) =>
                updatePreferences({
                  defaultHttpMethod: e.target.value as HttpMethod,
                })
              }
              mono
            >
              {HTTP_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </Select>
          </label>
        </Section>

        <Section title="Response">
          <label className="flex items-center justify-between gap-3 text-[0.8125rem] text-text-secondary">
            <span>Wrap response lines</span>
            <input
              type="checkbox"
              checked={preferences.wrapResponseLines}
              onChange={(e) =>
                updatePreferences({ wrapResponseLines: e.target.checked })
              }
              className="size-3.5 accent-accent"
            />
          </label>
        </Section>

        <Section title="Sync">
          {!signedIn ? (
            <p className="text-[0.8125rem] text-text-muted">Sign in to enable cloud sync.</p>
          ) : (
            <div className="space-y-3">
              <label className="flex items-center justify-between gap-3 text-[0.8125rem] text-text-secondary">
                <span>Enable cloud sync</span>
                <input
                  type="checkbox"
                  checked={preferences.syncEnabled}
                  aria-label="Enable cloud sync"
                  onChange={(e) => updatePreferences({ syncEnabled: e.target.checked })}
                  className="size-3.5 accent-accent"
                />
              </label>
              <div className="flex items-center justify-between gap-3">
                <div className="text-[0.75rem] text-text-muted">
                  <p>Status: {syncStatusLabel}</p>
                  <p>Last synced: {lastSyncedAt ? formatSyncedAt(lastSyncedAt) : "Never"}</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!preferences.syncEnabled || syncBusy}
                  onClick={syncNow}
                >
                  {syncBusy ? "Syncing…" : "Sync now"}
                </Button>
              </div>
            </div>
          )}
        </Section>

        <Section title="About">
          <p className="text-[0.8125rem] text-text-secondary">
            Endpt v1.0.0 — lightweight desktop API client for testing and integrating with
            HTTP endpoints
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border-default bg-bg-surface p-4">
      <h3 className="mb-3 text-[0.8125rem] font-semibold text-text-primary">{title}</h3>
      {children}
    </section>
  );
}

function formatSyncedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
