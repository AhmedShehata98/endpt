import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_USER_SETTINGS,
  type ThemePreference,
  type UserSettings,
} from "@modules/account";
import type { UserSettingsRepository } from "@modules/account/ports/user-settings.repository";
import type { HttpMethod } from "@modules/request";
import { debounce } from "@/lib/debounce";
import { nowIso } from "@/lib/time";
import { applyTheme } from "@/lib/theme";

export interface UserPreferences {
  theme: ThemePreference;
  defaultHttpMethod: HttpMethod;
  wrapResponseLines: boolean;
  syncEnabled: boolean;
}

interface UseUserPreferencesOptions {
  signedIn: boolean;
  userId: string | null;
  initialSettings: UserSettings | null;
  repository: UserSettingsRepository | null;
  onPersistError?: (message: string) => void;
}

type DebouncedPersist = ReturnType<typeof debounce<[UserSettings]>>;

function prefsFromSettings(settings: UserSettings): UserPreferences {
  return {
    theme: settings.theme,
    defaultHttpMethod: settings.defaultHttpMethod,
    wrapResponseLines: settings.wrapResponseLines,
    syncEnabled: settings.syncEnabled,
  };
}

const GUEST_PREFS: UserPreferences = {
  theme: DEFAULT_USER_SETTINGS.theme,
  defaultHttpMethod: DEFAULT_USER_SETTINGS.defaultHttpMethod,
  wrapResponseLines: DEFAULT_USER_SETTINGS.wrapResponseLines,
  syncEnabled: DEFAULT_USER_SETTINGS.syncEnabled,
};

export function useUserPreferences({
  signedIn,
  userId,
  initialSettings,
  repository,
  onPersistError,
}: UseUserPreferencesOptions) {
  const settingsKey = signedIn && initialSettings ? initialSettings.id : "guest";
  const [prefsKey, setPrefsKey] = useState(settingsKey);
  const [preferences, setPreferences] = useState<UserPreferences>(() =>
    signedIn && initialSettings ? prefsFromSettings(initialSettings) : GUEST_PREFS,
  );
  const onPersistErrorRef = useRef(onPersistError);
  const persistRef = useRef<(settings: UserSettings) => Promise<void>>(async () => {});
  const debouncedPersistRef = useRef<DebouncedPersist | null>(null);

  if (prefsKey !== settingsKey) {
    setPrefsKey(settingsKey);
    setPreferences(
      signedIn && initialSettings ? prefsFromSettings(initialSettings) : GUEST_PREFS,
    );
  }

  useEffect(() => {
    onPersistErrorRef.current = onPersistError;
  }, [onPersistError]);

  useEffect(() => {
    persistRef.current = async (settings: UserSettings) => {
      if (!repository) return;
      try {
        await repository.save(settings);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to save settings";
        onPersistErrorRef.current?.(message);
      }
    };
  }, [repository]);

  useEffect(() => {
    debouncedPersistRef.current = debounce((settings: UserSettings) => {
      void persistRef.current(settings);
    }, 300);
    return () => debouncedPersistRef.current?.cancel();
  }, []);

  useEffect(() => {
    applyTheme(preferences.theme);
  }, [preferences.theme]);

  useEffect(() => {
    if (preferences.theme !== "system") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, [preferences.theme]);

  const updatePreferences = useCallback(
    (patch: Partial<UserPreferences>) => {
      setPreferences((prev) => {
        const next = { ...prev, ...patch };
        if (signedIn && userId && repository && initialSettings) {
          debouncedPersistRef.current?.({
            id: initialSettings.id,
            userId,
            theme: next.theme,
            defaultHttpMethod: next.defaultHttpMethod,
            wrapResponseLines: next.wrapResponseLines,
            syncEnabled: next.syncEnabled,
            updatedAt: nowIso(),
            deletedAt: null,
          });
        }
        return next;
      });
    },
    [initialSettings, repository, signedIn, userId],
  );

  const setSyncEnabled = useCallback(
    (syncEnabled: boolean) => {
      updatePreferences({ syncEnabled });
    },
    [updatePreferences],
  );

  return { preferences, updatePreferences, setSyncEnabled };
}
