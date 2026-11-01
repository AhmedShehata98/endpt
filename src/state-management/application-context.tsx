import { createContext, useContext, type RefObject } from "react";
import type { EnvironmentVariable } from "@modules/environment";
import type {
  CascadeCounts,
  CascadeTarget,
  ProjectNode,
} from "@modules/project";
import type { RequestDraft } from "@modules/request";
import type { ResponseView } from "@modules/response";
import type { SendState } from "@/app/workspace-state";
import type { UserPreferences } from "@/hooks/useUserPreferences";

export interface ApplicationProjects {
  tree: ProjectNode[];
  ready: boolean;
  busy: boolean;
  createProject: (
    name: string,
    description?: string | null,
  ) => Promise<unknown>;
  renameProject: (
    id: string,
    name: string,
    description?: string | null,
  ) => Promise<unknown>;
  deleteProject: (id: string) => Promise<unknown>;
  createCollection: (
    projectId: string,
    name: string,
    description?: string | null,
  ) => Promise<unknown>;
  renameCollection: (
    id: string,
    name: string,
    description?: string | null,
  ) => Promise<unknown>;
  deleteCollection: (id: string) => Promise<unknown>;
  renameSavedRequest: (id: string, name: string) => Promise<unknown>;
  deleteSavedRequest: (id: string) => Promise<unknown>;
  countCascade: (target: CascadeTarget) => Promise<CascadeCounts | null>;
}

export interface ApplicationContextValue {
  draft: RequestDraft;
  setDraft: (draft: RequestDraft) => void;
  send: SendState;
  responseForView: ResponseView | null;
  showPreviousResponse: boolean;
  envValues: ReadonlyMap<string, string>;
  wrapLines: boolean;
  setWrapLines: (wrap: boolean) => void;
  sendCurrentDraft: () => void;
  openVariables: (focusKey?: string) => void;
  openFullscreen: () => void;
  handleCopyResult: (ok: boolean) => void;
  fullscreenTriggerRef: RefObject<HTMLButtonElement | null>;
  signedIn: boolean;
  goSignIn: () => void;
  goSignUp: () => void;
  signOut: () => void;
  openRequest: (id: string) => void;
  projects: ApplicationProjects;
  variables: EnvironmentVariable[];
  setVariables: (variables: EnvironmentVariable[]) => void;
  displayName: string | null;
  email: string | null;
  lastSyncedAt: string | null;
  syncStatusLabel: string;
  syncBusy: boolean;
  preferences: UserPreferences;
  updatePreferences: (patch: Partial<UserPreferences>) => void;
  syncNow: () => void;
}

const ApplicationContext = createContext<ApplicationContextValue | null>(null);

export const ApplicationProvider = ApplicationContext.Provider;

export function useApplicationContext(): ApplicationContextValue {
  const value = useContext(ApplicationContext);
  if (!value) {
    throw new Error("useApplicationContext must be used under /application");
  }
  return value;
}
