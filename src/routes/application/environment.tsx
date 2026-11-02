import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ENV_VAR_ROLE_DEFAULT_KEYS,
  unusedEnvRoles,
  type EnvVarRole,
} from "@modules/environment";
import {
  AddVariableDialog,
  type CustomVariableInput,
} from "@/views/environment/AddVariableDialog";
import { EnvironmentVariablesEditor } from "@/views/environment/EnvironmentVariablesEditor";
import { useApplicationContext } from "@/state-management/application-context";

export const Route = createFileRoute("/application/environment")({
  component: RouteComponent,
});

function RouteComponent() {
  const { variables, setVariables } = useApplicationContext();
  const [addOpen, setAddOpen] = useState(false);
  const availableRoles = unusedEnvRoles(variables);
  const existingKeys = useMemo(
    () => variables.filter((variable) => variable.deletedAt === null).map((variable) => variable.key),
    [variables],
  );

  const addFixed = useCallback(
    (role: EnvVarRole) => {
      setVariables([
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
    [setVariables, variables],
  );

  const addCustom = useCallback(
    ({ key, role }: CustomVariableInput) => {
      setVariables([
        ...variables,
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
      setAddOpen(false);
    },
    [setVariables, variables],
  );

  return (
    <>
      <EnvironmentVariablesEditor
        variables={variables}
        onVariablesChange={setVariables}
        onAddVariable={() => setAddOpen(true)}
      />
      <AddVariableDialog
        open={addOpen}
        roles={availableRoles}
        existingKeys={existingKeys}
        onSelectFixed={addFixed}
        onAddCustom={addCustom}
        onClose={() => setAddOpen(false)}
      />
    </>
  );
}
