import type { IconType } from "react-icons";
import {
  HiOutlineCog6Tooth,
  HiOutlineGlobeAlt,
  HiOutlineQueueList,
  HiOutlineSquares2X2,
  HiOutlineUserGroup,
} from "react-icons/hi2";

export type AppView =
  | "workspace"
  | "collections"
  | "environment"
  | "teams"
  | "settings"
  | "sign-in"
  | "sign-up";

export const VIEW_TO: Record<AppView, string> = {
  workspace: "/application/workspace",
  collections: "/application/collections",
  environment: "/application/environment",
  teams: "/application/teams",
  settings: "/application/settings",
  "sign-in": "/sign-in",
  "sign-up": "/sign-up",
};

export type MainNavId = Extract<
  AppView,
  "workspace" | "collections" | "environment" | "teams" | "settings"
>;

export const MAIN_NAV: Array<{
  id: MainNavId;
  to: string;
  label: string;
  icon: IconType;
}> = [
  { id: "workspace", to: VIEW_TO.workspace, label: "Workspace", icon: HiOutlineSquares2X2 },
  { id: "collections", to: VIEW_TO.collections, label: "Collections", icon: HiOutlineQueueList },
  { id: "environment", to: VIEW_TO.environment, label: "Environment", icon: HiOutlineGlobeAlt },
  { id: "teams", to: VIEW_TO.teams, label: "Teams", icon: HiOutlineUserGroup },
  { id: "settings", to: VIEW_TO.settings, label: "Settings", icon: HiOutlineCog6Tooth },
];

export const NAV_SECTIONS: Array<{
  id: "work" | "collaborate";
  label: string;
  itemIds: Array<Exclude<MainNavId, "settings">>;
}> = [
  { id: "work", label: "Work", itemIds: ["workspace", "collections", "environment"] },
  { id: "collaborate", label: "Collaborate", itemIds: ["teams"] },
];

export function isAuthView(view: AppView): boolean {
  return view === "sign-in" || view === "sign-up";
}
