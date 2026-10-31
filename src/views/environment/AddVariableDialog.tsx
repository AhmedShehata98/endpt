import { Button, Dialog } from "@/components";
import {
  ENV_VAR_ROLE_DEFAULT_KEYS,
  ENV_VAR_ROLE_LABELS,
  type EnvVarRole,
} from "@modules/environment";

interface AddVariableDialogProps {
  open: boolean;
  roles: readonly EnvVarRole[];
  onSelect: (role: EnvVarRole) => void;
  onClose: () => void;
}

export function AddVariableDialog({
  open,
  roles,
  onSelect,
  onClose,
}: AddVariableDialogProps) {
  return (
    <Dialog
      open={open}
      title="Add variable"
      onClose={onClose}
      footer={
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
      }
    >
      {roles.length === 0 ? (
        <p className="text-[0.8125rem] text-text-muted">
          All five variable roles are already defined.
        </p>
      ) : (
        <ul className="space-y-1">
          {roles.map((role) => (
            <li key={role}>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-md border border-border-subtle px-3 py-2 text-left text-[0.8125rem] hover:bg-bg-subtle"
                onClick={() => onSelect(role)}
              >
                <span className="font-medium text-text-primary">
                  {ENV_VAR_ROLE_LABELS[role]}
                </span>
                <span className="font-mono text-[0.75rem] text-accent">
                  {ENV_VAR_ROLE_DEFAULT_KEYS[role]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
