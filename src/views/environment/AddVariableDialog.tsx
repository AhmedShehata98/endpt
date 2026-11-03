import { useEffect, useMemo, useState } from "react";
import { Button, Dialog, Input, Select } from "@/components";
import {
  ENV_VAR_ROLE_DEFAULT_KEYS,
  ENV_VAR_ROLE_LABELS,
  ENV_VAR_ROLES,
  isValidEnvKey,
  type EnvVarRole,
} from "@modules/environment";

export interface CustomVariableInput {
  key: string;
  role: EnvVarRole;
}

interface AddVariableDialogProps {
  open: boolean;
  roles: readonly EnvVarRole[];
  existingKeys: readonly string[];
  initialKey?: string | null;
  preferCustom?: boolean;
  onSelectFixed: (role: EnvVarRole) => void;
  onAddCustom: (input: CustomVariableInput) => void;
  onClose: () => void;
}

export function AddVariableDialog({
  open,
  roles,
  existingKeys,
  initialKey = null,
  preferCustom = false,
  onSelectFixed,
  onAddCustom,
  onClose,
}: AddVariableDialogProps) {
  const [customKey, setCustomKey] = useState("");
  const [customRole, setCustomRole] = useState<EnvVarRole>("custom");

  useEffect(() => {
    if (!open) return;
    // #region agent log
    fetch('http://127.0.0.1:7635/ingest/bcdaf449-dbf5-42ff-82f0-312b883ff178',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c3f57c'},body:JSON.stringify({sessionId:'c3f57c',runId:'pre-fix',hypothesisId:'B,C',location:'AddVariableDialog.tsx:useEffect',message:'reset customKey from initialKey',data:{open,preferCustom,initialKeyType:typeof initialKey,initialKeyIsNull:initialKey===null,initialKeyCtor:initialKey!=null&&typeof initialKey==='object'?(initialKey as object).constructor?.name:null,initialKeyPreview:typeof initialKey==='string'?initialKey:String(initialKey).slice(0,80)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    setCustomKey(typeof initialKey === "string" ? initialKey : "");
    setCustomRole("custom");
  }, [open, initialKey]);

  const existingKeySet = useMemo(() => new Set(existingKeys), [existingKeys]);

  const customKeyError = useMemo(() => {
    // #region agent log
    fetch('http://127.0.0.1:7635/ingest/bcdaf449-dbf5-42ff-82f0-312b883ff178',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c3f57c'},body:JSON.stringify({sessionId:'c3f57c',runId:'pre-fix',hypothesisId:'B,C,D',location:'AddVariableDialog.tsx:customKeyError',message:'customKey before trim',data:{customKeyType:typeof customKey,hasTrim:typeof (customKey as {trim?:unknown})?.trim==='function',customKeyCtor:customKey!=null&&typeof customKey==='object'?(customKey as object).constructor?.name:null,customKeyPreview:typeof customKey==='string'?customKey:String(customKey).slice(0,80)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const trimmed = customKey.trim();
    if (trimmed === "") return preferCustom || customKey.length > 0 ? "Key is required" : null;
    if (!isValidEnvKey(trimmed)) {
      return "Use letters, numbers, or underscore; start with a letter or _";
    }
    if (existingKeySet.has(trimmed)) return `Key "${trimmed}" is already in use`;
    return null;
  }, [customKey, existingKeySet, preferCustom]);

  const canAddCustom = customKey.trim() !== "" && customKeyError === null;

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
      <div className="space-y-4">
        <section className="space-y-2">
          <h3 className="text-[0.75rem] font-medium uppercase tracking-wide text-text-muted">
            Suggested
          </h3>
          {roles.length === 0 ? (
            <p className="text-[0.8125rem] text-text-muted">
              All suggested variables are already defined. Add a custom variable below.
            </p>
          ) : (
            <ul className="space-y-1">
              {roles.map((role) => (
                <li key={role}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-md border border-border-subtle px-3 py-2 text-left text-[0.8125rem] hover:bg-bg-subtle"
                    onClick={() => onSelectFixed(role)}
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
        </section>

        <section className="space-y-2 border-t border-border-subtle pt-4">
          <h3 className="text-[0.75rem] font-medium uppercase tracking-wide text-text-muted">
            Custom variable
          </h3>
          <div className="space-y-2">
            <label className="block space-y-1">
              <span className="text-[0.75rem] text-text-secondary">Key</span>
              <Input
                mono
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                placeholder="myVariable"
                invalid={customKeyError !== null && customKey.trim() !== ""}
                aria-label="Custom variable key"
                autoFocus={preferCustom}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[0.75rem] text-text-secondary">Role</span>
              <Select
                className="w-full"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value as EnvVarRole)}
                aria-label="Custom variable role"
              >
                {ENV_VAR_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ENV_VAR_ROLE_LABELS[role]}
                  </option>
                ))}
              </Select>
            </label>
            {customKeyError && customKey.trim() !== "" ? (
              <p className="text-[0.75rem] text-error" role="alert">
                {customKeyError}
              </p>
            ) : null}
            <Button
              variant="primary"
              size="sm"
              disabled={!canAddCustom}
              onClick={() =>
                onAddCustom({
                  key: customKey.trim(),
                  role: customRole,
                })
              }
            >
              Add custom
            </Button>
          </div>
        </section>
      </div>
    </Dialog>
  );
}
