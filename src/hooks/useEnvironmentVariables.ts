import { useState } from "react";
import type { EnvironmentVariable } from "@modules/environment";
import { MOCK_ENV_VARS } from "@/app/mock-data";

export function useEnvironmentVariables() {
  const [variables, setVariables] = useState<EnvironmentVariable[]>(MOCK_ENV_VARS);
  return { variables, setVariables };
}
