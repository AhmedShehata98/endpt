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
import {
  AddVariableDialog,
  type CustomVariableInput,
} from "./environment/AddVariableDialog";
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

function resolveInitialAdd(
  variables: readonly EnvironmentVariable[],
  focusKey: string | null,
): { open: boolean; pendingRole: EnvVarRole | null; customKey: string | null } {
  if (!focusKey) {
    return { open: false, pendingRole: null, customKey: null };
  }
  if (variables.some((variable) => variable.key === focusKey && variable.deletedAt === null)) {
    return { open: false, pendingRole: null, customKey: null };
  }
  const role = roleForDefaultKey(focusKey);
  if (role) {
    return { open: true, pendingRole: role, customKey: null };
  }
  return { open: true, pendingRole: null, customKey: focusKey };
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
  // #region agent log
  fetch('http://127.0.0.1:7635/ingest/bcdaf449-dbf5-42ff-82f0-312b883ff178',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c3f57c'},body:JSON.stringify({sessionId:'c3f57c',runId:'pre-fix',hypothesisId:'A,E',location:'VariablesDrawer.tsx:session',message:'VariablesDrawerSession mount with focusKey',data:{focusKeyType:typeof focusKey,focusKeyIsNull:focusKey===null,focusKeyCtor:focusKey!=null&&typeof focusKey==='object'?(focusKey as object).constructor?.name:null,focusKeyPreview:typeof focusKey==='string'?focusKey:String(focusKey).slice(0,120),looksLikeEvent:typeof focusKey==='object'&&focusKey!==null&&('nativeEvent' in (focusKey as object)||'target' in (focusKey as object))},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  const initialAdd = resolveInitialAdd(variables, focusKey);
  const [addOpen, setAddOpen] = useState(() => initialAdd.open);
  const [pendingAddRole, setPendingAddRole] = useState<EnvVarRole | null>(
    () => initialAdd.pendingRole,
  );
  const [customInitialKey, setCustomInitialKey] = useState<string | null>(
    () => initialAdd.customKey,
  );
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const dirty = useMemo(() => !sameVariables(draft, baseline), [draft, baseline]);
  const availableRoles = unusedEnvRoles(draft);
  const existingKeys = useMemo(
    () => draft.filter((variable) => variable.deletedAt === null).map((variable) => variable.key),
    [draft],
  );
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

  const closeAddDialog = useCallback(() => {
    setAddOpen(false);
    setPendingAddRole(null);
    setCustomInitialKey(null);
  }, []);

  const addFixed = useCallback((role: EnvVarRole) => {
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
    closeAddDialog();
  }, [closeAddDialog]);

  const addCustom = useCallback(
    ({ key, role }: CustomVariableInput) => {
      setDraft((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          userId: null,
          key,
          value: "",
          role,
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        },
      ]);
      closeAddDialog();
    },
    [closeAddDialog],
  );

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
            setCustomInitialKey(null);
            setAddOpen(true);
          }}
          highlightKey={focusKey}
          showHeader={false}
        />
      </Drawer>

      <AddVariableDialog
        open={addOpen}
        roles={pickerRoles}
        existingKeys={existingKeys}
        initialKey={customInitialKey}
        preferCustom={customInitialKey !== null}
        onSelectFixed={addFixed}
        onAddCustom={addCustom}
        onClose={closeAddDialog}
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
