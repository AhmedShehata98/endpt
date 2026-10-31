import { cn } from "@/lib/cn";

export interface TabItem {
  id: string;
  label: string;
  badge?: string | number;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ items, value, onChange, className }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex h-8 items-center gap-0.5 border-b border-border-default",
        className,
      )}
    >
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={cn(
              "inline-flex h-full items-center gap-1.5 border-b-2 px-3 text-[0.8125rem] font-medium transition-colors",
              active
                ? "border-accent text-text-primary"
                : "border-transparent text-text-muted hover:text-text-primary",
            )}
            onClick={() => onChange(item.id)}
          >
            {item.label}
            {item.badge != null && (
              <span className="rounded bg-bg-active px-1.5 font-mono text-[0.6875rem] text-text-secondary">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
