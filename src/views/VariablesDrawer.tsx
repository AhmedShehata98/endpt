import { useCallback, useMemo, useState } from "react";
import { Button, Dialog, Drawer } from "@/components";
import {
  ENV_VAR_ROLE_DEFAULT_KEYS,
  roleForDefaultKey,
  unusedEnvRoles,
  validateEnvVariables,
  type EnvironmentVariable,
  type EnvVarRole,
} from "@modules/environment";
import { AddVariableDialog } from "./environment/AddVariableDialog";
import { EnvironmentVariablesEditor } from "./environment/EnvironmentVariablesEditor";

interface VariablesDrawerProps {
  open: boolean;
  variables: EnvironmentVariable[];
  focusKey?: string | null;
  onApply: (variables: EnvironmentVariable[]) => void;
  onClose: () => void;
}

function cloneVariables(variables: EnvironmentVariable[]): EnvironmentVariable[] {
  return variables.map((variable) => ({ ...variable }));
}

function sameVariables(
  left: readonly EnvironmentVariable[],
  right: readonly EnvironmentVariable[],
): boolean {
  if (left.length !== right.length) return false;
  return left.every((variable, index) => {
    const other = right[index];
    return (
      other !== undefined &&
      variable.id === other.id &&
      variable.key === other.key &&
      variable.value === other.value &&
      variable.role === other.role &&
      variable.deletedAt === other.deletedAt
    );
  });
}

function shouldOfferAdd(
  variables: readonly EnvironmentVariable[],
  focusKey: string | null,
): EnvVarRole | null {
  if (!focusKey) return null;
  const role = roleForDefaultKey(focusKey);
  if (!role) return null;
  if (variables.some((variable) => variable.key === focusKey)) return null;
  return role;
}

export function VariablesDrawer({
  open,
  variables,
  focusKey = null,
  onApply,
  onClose,
}: VariablesDrawerProps) {
  if (!open) return null;

  return (
    <VariablesDrawerSession
      variables={variables}
      focusKey={focusKey}
      onApply={onApply}
      onClose={onClose}
    />
  );
}

interface VariablesDrawerSessionProps {
  variables: EnvironmentVariable[];
  focusKey: string | null;
  onApply: (variables: EnvironmentVariable[]) => void;
  onClose: () => void;
}

function VariablesDrawerSession({
  variables,
  focusKey,
  onApply,
  onClose,
}: VariablesDrawerSessionProps) {
  const [baseline] = useState(() => cloneVariables(variables));
  const [draft, setDraft] = useState(() => cloneVariables(variables));
  const initialOffer = shouldOfferAdd(variables, focusKey);
  const [addOpen, setAddOpen] = useState(() => initialOffer !== null);
  const [pendingAddRole, setPendingAddRole] = useState<EnvVarRole | null>(
    () => initialOffer,
  );
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const dirty = useMemo(() => !sameVariables(draft, baseline), [draft, baseline]);
  const availableRoles = unusedEnvRoles(draft);
  const hasValidationErrors = validateEnvVariables(draft).length > 0;

  const requestClose = useCallback(() => {
    if (dirty) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  }, [dirty, onClose]);

  const discardAndClose = useCallback(() => {
    setConfirmDiscard(false);
    onClose();
  }, [onClose]);

  const applyAndClose = useCallback(() => {
    if (hasValidationErrors) return;
    onApply(draft);
    onClose();
  }, [draft, hasValidationErrors, onApply, onClose]);

  const addRole = useCallback((role: EnvVarRole) => {
    setDraft((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        userId: null,
        key: ENV_VAR_ROLE_DEFAULT_KEYS[role],
        value: "",
        role,
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      },
    ]);
    setAddOpen(false);
    setPendingAddRole(null);
  }, []);

  const pickerRoles = useMemo(() => {
    if (pendingAddRole && availableRoles.includes(pendingAddRole)) {
      return [pendingAddRole, ...availableRoles.filter((role) => role !== pendingAddRole)];
    }
    return availableRoles;
  }, [availableRoles, pendingAddRole]);

  return (
    <>
      <Drawer
        open
        title="Variables"
        onClose={requestClose}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={requestClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={applyAndClose}
              disabled={!dirty || hasValidationErrors}
            >
              Apply
            </Button>
          </>
        }
      >
        <EnvironmentVariablesEditor
          variables={draft}
          onVariablesChange={setDraft}
          onAddVariable={() => {
            setPendingAddRole(null);
            setAddOpen(true);
          }}
          addDisabled={availableRoles.length === 0}
          highlightKey={focusKey}
          showHeader={false}
        />
      </Drawer>

      <AddVariableDialog
        open={addOpen}
        roles={pickerRoles}
        onSelect={addRole}
        onClose={() => {
          setAddOpen(false);
          setPendingAddRole(null);
        }}
      />

      <Dialog
        open={confirmDiscard}
        title="Discard unsaved changes?"
        onClose={() => setConfirmDiscard(false)}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDiscard(false)}>
              Keep editing
            </Button>
            <Button variant="destructive" size="sm" onClick={discardAndClose}>
              Discard
            </Button>
          </>
        }
      >
        <p className="text-[0.8125rem] text-text-secondary">
          You have unsaved variable edits. Closing now discards them.
        </p>
      </Dialog>
    </>
  );
}
