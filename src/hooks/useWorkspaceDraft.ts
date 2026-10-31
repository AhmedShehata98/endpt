import { useCallback, useEffect, useRef, useState } from "react";
import {
  createEmptyDraft,
  type AdHocRequest,
  type HttpMethod,
  type RequestDraft,
} from "@modules/request";
import type { AdHocRequestRepository } from "@modules/request";
import { MOCK_DRAFT } from "@/app/mock-data";
import { debounce } from "@/lib/debounce";

const DRAFT_DEBOUNCE_MS = 400;
const GUEST_DRAFT_ID = "ad-hoc-guest";

function nowIso(): string {
  return new Date().toISOString();
}

export function useWorkspaceDraft(
  defaultMethod: HttpMethod,
  repository: AdHocRequestRepository | null,
) {
  const [draft, setDraftState] = useState<RequestDraft>(MOCK_DRAFT);
  const [ready, setReady] = useState(false);
  const [adHocId, setAdHocId] = useState(GUEST_DRAFT_ID);

  const persist = useCallback(
    async (next: RequestDraft) => {
      if (!repository) return;
      const record: AdHocRequest = {
        id: adHocId,
        userId: null,
        draft: next,
        updatedAt: nowIso(),
      };
      await repository.save(record);
    },
    [adHocId, repository],
  );

  const debouncedPersist = useRef(
    debounce((next: RequestDraft) => {
      void persist(next);
    }, DRAFT_DEBOUNCE_MS),
  );

  useEffect(() => {
    debouncedPersist.current = debounce((next: RequestDraft) => {
      void persist(next);
    }, DRAFT_DEBOUNCE_MS);
    return () => debouncedPersist.current.cancel();
  }, [persist]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!repository) {
        setReady(false);
        return;
      }
      const existing = await repository.getByUserId(null);
      if (cancelled) return;
      if (existing) {
        setAdHocId(existing.id);
        setDraftState(existing.draft);
      } else {
        const seed: AdHocRequest = {
          id: GUEST_DRAFT_ID,
          userId: null,
          draft: MOCK_DRAFT,
          updatedAt: nowIso(),
        };
        await repository.save(seed);
        if (cancelled) return;
        setAdHocId(seed.id);
        setDraftState(seed.draft);
      }
      setReady(true);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [repository]);

  useEffect(() => {
    const flush = () => debouncedPersist.current.flush();
    window.addEventListener("pagehide", flush);
    window.addEventListener("blur", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("blur", flush);
      flush();
    };
  }, []);

  const setDraft = useCallback((next: RequestDraft | ((prev: RequestDraft) => RequestDraft)) => {
    setDraftState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      debouncedPersist.current(value);
      return value;
    });
  }, []);

  const startNewRequest = useCallback(() => {
    const empty = createEmptyDraft(defaultMethod);
    setDraft(empty);
  }, [defaultMethod, setDraft]);

  const openSavedRequest = useCallback(
    (name: string, method: HttpMethod) => {
      setDraft({
        ...createEmptyDraft(method),
        name,
        url: "{{baseUrl}}/",
      });
    },
    [setDraft],
  );

  return { draft, setDraft, startNewRequest, openSavedRequest, ready };
}
