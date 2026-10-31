import { useCallback, useEffect, useRef, useState } from "react";
import {
  createEmptyDraft,
  type AdHocRequest,
  type AdHocRequestRepository,
  type HttpMethod,
  type RequestDraft,
} from "@modules/request";
import { debounce } from "@/lib/debounce";
import { nowIso } from "@/lib/time";

const DRAFT_DEBOUNCE_MS = 400;
const GUEST_DRAFT_ID = "ad-hoc-guest";

type DebouncedPersist = ReturnType<typeof debounce<[RequestDraft]>>;

interface UseWorkspaceDraftOptions {
  defaultMethod: HttpMethod;
  repository: AdHocRequestRepository | null;
  onPersistError?: (message: string) => void;
}

export function useWorkspaceDraft({
  defaultMethod,
  repository,
  onPersistError,
}: UseWorkspaceDraftOptions) {
  const [draft, setDraftState] = useState<RequestDraft>(() =>
    createEmptyDraft(defaultMethod),
  );
  const [ready, setReady] = useState(false);
  const [adHocId, setAdHocId] = useState(GUEST_DRAFT_ID);
  const dirtyRef = useRef(false);
  const onPersistErrorRef = useRef(onPersistError);
  const persistRef = useRef<(next: RequestDraft) => Promise<void>>(async () => {});
  const debouncedPersistRef = useRef<DebouncedPersist | null>(null);

  useEffect(() => {
    onPersistErrorRef.current = onPersistError;
  }, [onPersistError]);

  const reportPersistError = useCallback((error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Failed to save request draft";
    onPersistErrorRef.current?.(message);
  }, []);

  useEffect(() => {
    persistRef.current = async (next: RequestDraft) => {
      if (!repository) return;
      const record: AdHocRequest = {
        id: adHocId,
        userId: null,
        draft: next,
        updatedAt: nowIso(),
      };
      try {
        await repository.save(record);
      } catch (error) {
        reportPersistError(error);
      }
    };
  }, [adHocId, repository, reportPersistError]);

  useEffect(() => {
    debouncedPersistRef.current = debounce((next: RequestDraft) => {
      void persistRef.current(next);
    }, DRAFT_DEBOUNCE_MS);
    return () => debouncedPersistRef.current?.cancel();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!repository) {
        setReady(false);
        return;
      }

      try {
        const existing = await repository.getByUserId(null);
        if (cancelled || dirtyRef.current) return;

        if (existing) {
          setAdHocId(existing.id);
          setDraftState(existing.draft);
        } else {
          const empty = createEmptyDraft(defaultMethod);
          const seed: AdHocRequest = {
            id: GUEST_DRAFT_ID,
            userId: null,
            draft: empty,
            updatedAt: nowIso(),
          };
          await repository.save(seed);
          if (cancelled || dirtyRef.current) return;
          setAdHocId(seed.id);
          setDraftState(seed.draft);
        }
        setReady(true);
      } catch (error) {
        if (!cancelled) {
          reportPersistError(error);
          setReady(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [defaultMethod, repository, reportPersistError]);

  useEffect(() => {
    const flush = () => debouncedPersistRef.current?.flush();
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  const setDraft = useCallback(
    (next: RequestDraft | ((prev: RequestDraft) => RequestDraft)) => {
      dirtyRef.current = true;
      setDraftState((prev) => {
        const value = typeof next === "function" ? next(prev) : next;
        debouncedPersistRef.current?.(value);
        return value;
      });
    },
    [],
  );

  const startNewRequest = useCallback(() => {
    setDraft(createEmptyDraft(defaultMethod));
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
