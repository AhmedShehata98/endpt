import { Button } from "@/components";
import { MAIN_NAV, type AppView } from "@/app/navigation";
import { LogoMark } from "./LogoMark";
import { cn } from "@/lib/cn";

interface SidebarProps {
  activeView: AppView;
  collapsed: boolean;
  onNavigate: (view: AppView) => void;
  onNewRequest: () => void;
}

export function Sidebar({ activeView, collapsed, onNavigate, onNewRequest }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-border-default bg-bg-surface",
        collapsed ? "w-14" : "w-60",
      )}
    >
      <div
        className={cn(
          "flex h-12 items-center border-b border-border-default",
          collapsed ? "justify-center px-2" : "gap-2 px-3",
        )}
      >
        <LogoMark className="size-7 shrink-0" />
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight text-text-primary">Endpt</span>
        )}
      </div>

      <div className={cn("border-b border-border-default p-2", collapsed && "px-1.5")}>
        <Button
          variant="primary"
          className={cn("w-full", collapsed && "px-0")}
          onClick={onNewRequest}
          aria-label="New Request"
          title="New Request (Ctrl/Cmd+N)"
        >
          {collapsed ? "+" : "New Request"}
        </Button>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-2" aria-label="Main">
        {MAIN_NAV.filter((item) => item.id !== "settings").map((item) => {
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              title={item.label}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex h-8 items-center gap-2 rounded-md px-2 text-[0.8125rem] font-medium transition-colors",
                collapsed && "justify-center px-0",
                active
                  ? "bg-accent-subtle text-accent"
                  : "text-text-secondary hover:bg-bg-subtle hover:text-text-primary",
              )}
            >
              <span aria-hidden className="w-4 text-center text-xs">
                {item.icon}
              </span>
              {!collapsed && item.label}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-border-default p-2">
        <button
          type="button"
          title="Settings"
          onClick={() => onNavigate("settings")}
          className={cn(
            "flex h-8 w-full items-center gap-2 rounded-md px-2 text-[0.8125rem] font-medium transition-colors",
            collapsed && "justify-center px-0",
            activeView === "settings"
              ? "bg-accent-subtle text-accent"
              : "text-text-secondary hover:bg-bg-subtle hover:text-text-primary",
          )}
        >
          <span aria-hidden className="w-4 text-center text-xs">
            ⚙
          </span>
          {!collapsed && "Settings"}
        </button>
      </div>
    </aside>
  );
}
