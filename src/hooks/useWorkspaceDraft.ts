import { useCallback, useState } from "react";
import { createEmptyDraft, type HttpMethod, type RequestDraft } from "@modules/request";
import { MOCK_DRAFT } from "@/app/mock-data";

export function useWorkspaceDraft(defaultMethod: HttpMethod) {
  const [draft, setDraft] = useState<RequestDraft>(MOCK_DRAFT);

  const startNewRequest = useCallback(() => {
    setDraft(createEmptyDraft(defaultMethod));
  }, [defaultMethod]);

  const openSavedRequest = useCallback((name: string, method: HttpMethod) => {
    setDraft({
      ...createEmptyDraft(method),
      name,
      url: "{{baseUrl}}/",
    });
  }, []);

  return { draft, setDraft, startNewRequest, openSavedRequest };
}
