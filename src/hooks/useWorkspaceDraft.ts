import { useCallback, useEffect, useRef, useState } from "react";
import {
  createEmptyDraft,
  type AdHocRequest,
  type AdHocRequestRepository,
  type HttpMethod,
  type RequestDraft,
} from "@modules/request";
import type { SaveState } from "@/app/workspace-state";
import { debounce } from "@/lib/debounce";
import { nowIso } from "@/lib/time";

const DRAFT_DEBOUNCE_MS = 400;
const GUEST_DRAFT_ID = "ad-hoc-guest";
const SAVED_FLASH_MS = 1500;

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
  const [saveState, setSaveState] = useState<SaveState>("ad-hoc");
  const dirtyRef = useRef(false);
  const onPersistErrorRef = useRef(onPersistError);
  const persistRef = useRef<(next: RequestDraft) => Promise<void>>(async () => {});
  const debouncedPersistRef = useRef<DebouncedPersist | null>(null);
  const savedFlashTimerRef = useRef<number | null>(null);

  useEffect(() => {
    onPersistErrorRef.current = onPersistError;
  }, [onPersistError]);

  useEffect(() => {
    return () => {
      if (savedFlashTimerRef.current != null) {
        window.clearTimeout(savedFlashTimerRef.current);
      }
    };
  }, []);

  const reportPersistError = useCallback((error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Failed to save request draft";
    onPersistErrorRef.current?.(message);
  }, []);

  const markSaved = useCallback(() => {
    setSaveState("saved");
    if (savedFlashTimerRef.current != null) {
      window.clearTimeout(savedFlashTimerRef.current);
    }
    savedFlashTimerRef.current = window.setTimeout(() => {
      setSaveState("ad-hoc");
      savedFlashTimerRef.current = null;
    }, SAVED_FLASH_MS);
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
        markSaved();
      } catch (error) {
        reportPersistError(error);
        setSaveState("unsaved");
      }
    };
  }, [adHocId, markSaved, repository, reportPersistError]);

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
        setSaveState("ad-hoc");
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
      setSaveState("unsaved");
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

  return { draft, setDraft, startNewRequest, openSavedRequest, ready, saveState };
}
