import { Drawer } from "@/components";
import { MOCK_ENV_VARS } from "@/app/mock-data";
import { SECRET_ENV_ROLES } from "@modules/environment";

interface VariablesDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function VariablesDrawer({ open, onClose }: VariablesDrawerProps) {
  return (
    <Drawer open={open} title="Variables" onClose={onClose}>
      <div className="divide-y divide-border-subtle">
        {MOCK_ENV_VARS.map((v) => (
          <div key={v.id} className="space-y-1 p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[0.75rem] font-semibold text-accent">{v.key}</span>
              <span className="rounded bg-bg-active px-1.5 text-[0.6875rem] text-text-muted">
                {v.role}
              </span>
            </div>
            <p className="truncate font-mono text-[0.75rem] text-text-secondary">
              {SECRET_ENV_ROLES.has(v.role) ? "••••••••" : v.value || "(empty)"}
            </p>
          </div>
        ))}
      </div>
      <p className="border-t border-border-default p-3 text-[0.75rem] text-text-muted">
        Edit full list in Environment. Secrets stay masked here.
      </p>
    </Drawer>
  );
}
