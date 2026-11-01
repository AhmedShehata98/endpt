import { Button } from "@/components";
import { MAIN_NAV } from "@/app/navigation";
import { LogoMark } from "./LogoMark";
import { cn } from "@/lib/cn";
import { Link } from '@tanstack/react-router';

interface SidebarProps {
  collapsed: boolean;
  onNewRequest: () => void;
}

export function Sidebar({ collapsed, onNewRequest }: SidebarProps) {
  const settings = MAIN_NAV.find((item) => item.id === "settings");
  const SettingsIcon = settings?.icon;

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
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              to={item.to}
              title={item.label}
              aria-label={item.label}
              activeProps={{
                className: "bg-accent-subtle text-accent",
                "aria-current": 'page'
              }}
              inactiveProps={{
                className: "text-text-secondary hover:bg-bg-subtle hover:text-text-primary",
              }} 
              className={cn(
                "flex h-8 items-center gap-2 rounded-md px-2 text-[0.8125rem] font-medium transition-colors",
                collapsed && "justify-center px-0", 
              )}
            >
              <Icon aria-hidden className="size-4 shrink-0" />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      {settings && SettingsIcon && (
        <div className="border-t border-border-default p-2">
          <Link
            to={settings.to}
            title={settings.label}
            aria-label={settings.label}
            activeProps={{
              className: "bg-accent-subtle text-accent",
              "aria-current": 'page'
            }}
            inactiveProps={{
              className: "text-text-secondary hover:bg-bg-subtle hover:text-text-primary",
            }}
            className={cn(
              "flex h-8 w-full items-center gap-2 rounded-md px-2 text-[0.8125rem] font-medium transition-colors",
              collapsed && "justify-center px-0",
            )}
          >
            <SettingsIcon aria-hidden className="size-4 shrink-0" />
            {!collapsed && settings.label}
          </Link>
        </div>
      )}
    </aside>
  );
}
