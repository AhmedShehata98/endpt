import type { HttpMethod } from "@modules/request";

export type ThemePreference = "system" | "light" | "dark";

export interface UserAccount {
  id: string;
  email: string;
  displayName: string | null;
  cloudUserId: string | null;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt: string | null;
  deletedAt: string | null;
}

export interface Session {
  id: string;
  userId: string;
  accessToken: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface UserSettings {
  id: string;
  userId: string;
  theme: ThemePreference;
  defaultHttpMethod: HttpMethod;
  wrapResponseLines: boolean;
  syncEnabled: boolean;
  updatedAt: string;
  deletedAt: string | null;
}

export const DEFAULT_USER_SETTINGS = {
  theme: "system" as ThemePreference,
  defaultHttpMethod: "GET" as HttpMethod,
  wrapResponseLines: false,
  syncEnabled: false,
};
