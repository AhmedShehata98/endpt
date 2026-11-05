import { Button } from "@/components";
import { MAIN_NAV, NAV_SECTIONS, type MainNavId } from "@/app/navigation";
import { LogoMark } from "./LogoMark";
import { cn } from "@/lib/cn";
import { Link } from "@tanstack/react-router";

interface SidebarProps {
  collapsed: boolean;
  onNewRequest: () => void;
}

type NavItem = (typeof MAIN_NAV)[number];

const linkClass =
  "flex h-8 items-center gap-2 rounded-md px-2 text-[0.8125rem] font-medium transition-colors";

export function Sidebar({ collapsed, onNewRequest }: SidebarProps) {
  const settings = MAIN_NAV.find((item) => item.id === "settings");

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

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2" aria-label="Main">
        {NAV_SECTIONS.map((section, index) => (
          <div key={section.id} className="flex flex-col gap-0.5">
            {collapsed ? (
              index > 0 && <div className="mx-1.5 my-1 border-t border-border-default" />
            ) : (
              <p className="px-2 pb-1 pt-2 text-[0.6875rem] font-medium uppercase tracking-wide text-text-muted">
                {section.label}
              </p>
            )}
            {section.itemIds.map((id) => {
              const item = findNavItem(id);
              return item ? <NavLink key={item.id} item={item} collapsed={collapsed} /> : null;
            })}
          </div>
        ))}
      </nav>

      {settings && (
        <div className="border-t border-border-default p-2">
          <NavLink item={settings} collapsed={collapsed} />
        </div>
      )}
    </aside>
  );
}

function findNavItem(id: MainNavId): NavItem | undefined {
  return MAIN_NAV.find((item) => item.id === id);
}

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      title={item.label}
      aria-label={item.label}
      activeProps={{
        className: "bg-accent-subtle text-accent",
        "aria-current": "page",
      }}
      inactiveProps={{
        className: "text-text-secondary hover:bg-bg-subtle hover:text-text-primary",
      }}
      className={cn(linkClass, collapsed && "justify-center px-0")}
    >
      <Icon aria-hidden className="size-4 shrink-0" />
      {!collapsed && item.label}
    </Link>
  );
}
