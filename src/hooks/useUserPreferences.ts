import { useEffect, useState } from "react";
import { DEFAULT_USER_SETTINGS, type ThemePreference } from "@modules/account";
import type { HttpMethod } from "@modules/request";
import { applyTheme } from "@/lib/theme";

export interface UserPreferences {
  theme: ThemePreference;
  defaultHttpMethod: HttpMethod;
  wrapResponseLines: boolean;
  syncEnabled: boolean;
}

export function useUserPreferences() {
  const [theme, setTheme] = useState<ThemePreference>(DEFAULT_USER_SETTINGS.theme);
  const [defaultHttpMethod, setDefaultHttpMethod] = useState<HttpMethod>(
    DEFAULT_USER_SETTINGS.defaultHttpMethod,
  );
  const [wrapResponseLines, setWrapResponseLines] = useState(
    DEFAULT_USER_SETTINGS.wrapResponseLines,
  );
  const [syncEnabled, setSyncEnabled] = useState(false);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, [theme]);

  const preferences: UserPreferences = {
    theme,
    defaultHttpMethod,
    wrapResponseLines,
    syncEnabled,
  };

  function updatePreferences(patch: Partial<UserPreferences>): void {
    if (patch.theme !== undefined) setTheme(patch.theme);
    if (patch.defaultHttpMethod !== undefined) setDefaultHttpMethod(patch.defaultHttpMethod);
    if (patch.wrapResponseLines !== undefined) setWrapResponseLines(patch.wrapResponseLines);
    if (patch.syncEnabled !== undefined) setSyncEnabled(patch.syncEnabled);
  }

  return { preferences, updatePreferences, setSyncEnabled };
}
