export type AppView =
  | "workspace"
  | "collections"
  | "environment"
  | "settings"
  | "sign-in"
  | "sign-up";

export const MAIN_NAV: Array<{
  id: Extract<AppView, "workspace" | "collections" | "environment" | "settings">;
  label: string;
  icon: string;
}> = [
  { id: "workspace", label: "Workspace", icon: "▦" },
  { id: "collections", label: "Collections", icon: "☰" },
  { id: "environment", label: "Environment", icon: "⧉" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

export function isAuthView(view: AppView): boolean {
  return view === "sign-in" || view === "sign-up";
}
