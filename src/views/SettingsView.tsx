import type { ReactNode } from "react";
import { Button, Select } from "@/components";
import type { ThemePreference } from "@modules/account";
import type { HttpMethod } from "@modules/request";

interface SettingsViewProps {
  signedIn: boolean;
  theme: ThemePreference;
  defaultMethod: HttpMethod;
  wrapLines: boolean;
  syncEnabled: boolean;
  onThemeChange: (theme: ThemePreference) => void;
  onDefaultMethodChange: (method: HttpMethod) => void;
  onWrapLinesChange: (wrap: boolean) => void;
  onSyncEnabledChange: (enabled: boolean) => void;
  onSignIn: () => void;
}

export function SettingsView({
  signedIn,
  theme,
  defaultMethod,
  wrapLines,
  syncEnabled,
  onThemeChange,
  onDefaultMethodChange,
  onWrapLinesChange,
  onSyncEnabledChange,
  onSignIn,
}: SettingsViewProps) {
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
            <p className="text-[0.8125rem] text-text-secondary">Signed in locally.</p>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-[0.8125rem] text-text-secondary">
                Guests use defaults. Sign in to save preferences.
              </p>
              <Button variant="secondary" size="sm" onClick={onSignIn}>
                Sign in
              </Button>
            </div>
          )}
        </Section>

        <Section title="Appearance">
          <label className="flex items-center justify-between gap-3 text-[0.8125rem]">
            <span className="text-text-secondary">Theme</span>
            <Select
              aria-label="Theme"
              value={theme}
              onChange={(e) => onThemeChange(e.target.value as ThemePreference)}
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
              value={defaultMethod}
              onChange={(e) => onDefaultMethodChange(e.target.value as HttpMethod)}
              mono
            >
              {(["GET", "POST", "PUT", "PATCH", "DELETE"] as HttpMethod[]).map((m) => (
                <option key={m} value={m}>
                  {m}
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
              checked={wrapLines}
              onChange={(e) => onWrapLinesChange(e.target.checked)}
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
                  checked={syncEnabled}
                  onChange={(e) => onSyncEnabledChange(e.target.checked)}
                  className="size-3.5 accent-accent"
                />
              </label>
              <div className="flex items-center justify-between">
                <span className="text-[0.75rem] text-text-muted">Status: Local only</span>
                <Button variant="secondary" size="sm" disabled={!syncEnabled}>
                  Sync now
                </Button>
              </div>
            </div>
          )}
        </Section>

        <Section title="About">
          <p className="text-[0.8125rem] text-text-secondary">Endpt v0.1.0 — desktop API client</p>
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
