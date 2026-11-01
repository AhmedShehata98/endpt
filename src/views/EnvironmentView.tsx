/**
 * TODO DELETED — extracted to `src/routes/application/environment.tsx`. Remove this file when safe.
 */
export function EnvironmentView() {
  return null;
}

/*
import { useCallback, useState } from "react";
import {
  ENV_VAR_ROLE_DEFAULT_KEYS,
  unusedEnvRoles,
  type EnvironmentVariable,
  type EnvVarRole,
} from "@modules/environment";
import { AddVariableDialog } from "./environment/AddVariableDialog";
import { EnvironmentVariablesEditor } from "./environment/EnvironmentVariablesEditor";

interface EnvironmentViewProps {
  variables: EnvironmentVariable[];
  onVariablesChange: (variables: EnvironmentVariable[]) => void;
}

export function EnvironmentView({ variables, onVariablesChange }: EnvironmentViewProps) {
  const [addOpen, setAddOpen] = useState(false);
  const availableRoles = unusedEnvRoles(variables);

  const addRole = useCallback(
    (role: EnvVarRole) => {
      onVariablesChange([
        ...variables,
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
    },
    [onVariablesChange, variables],
  );

  return (
    <>
      <EnvironmentVariablesEditor
        variables={variables}
        onVariablesChange={onVariablesChange}
        onAddVariable={() => setAddOpen(true)}
        addDisabled={availableRoles.length === 0}
      />
      <AddVariableDialog
        open={addOpen}
        roles={availableRoles}
        onSelect={addRole}
        onClose={() => setAddOpen(false)}
      />
    </>
  );
}
*/
