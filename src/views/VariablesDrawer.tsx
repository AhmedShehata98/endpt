import { Drawer } from "@/components";
import { SECRET_ENV_ROLES, type EnvironmentVariable } from "@modules/environment";

interface VariablesDrawerProps {
  open: boolean;
  variables: EnvironmentVariable[];
  onClose: () => void;
}

export function VariablesDrawer({ open, variables, onClose }: VariablesDrawerProps) {
  return (
    <Drawer open={open} title="Variables" onClose={onClose}>
      <div className="divide-y divide-border-subtle">
        {variables.map((variable) => (
          <div key={variable.id} className="space-y-1 p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[0.75rem] font-semibold text-accent">
                {variable.key}
              </span>
              <span className="rounded bg-bg-active px-1.5 text-[0.6875rem] text-text-muted">
                {variable.role}
              </span>
            </div>
            <p className="truncate font-mono text-[0.75rem] text-text-secondary">
              {SECRET_ENV_ROLES.has(variable.role) ? "••••••••" : variable.value || "(empty)"}
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
