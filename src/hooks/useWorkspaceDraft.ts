import { useCallback, useEffect, useRef, useState } from "react";
import type { ProjectService } from "@modules/project";
import {
  createEmptyDraft,
  type AdHocRequest,
  type AdHocRequestRepository,
  type HttpMethod,
  type RequestDraft,
  type SavedRequest,
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
  projectService: ProjectService | null;
  onPersistError?: (message: string) => void;
}

export function useWorkspaceDraft({
  defaultMethod,
  repository,
  projectService,
  onPersistError,
}: UseWorkspaceDraftOptions) {
  const [draft, setDraftState] = useState<RequestDraft>(() =>
    createEmptyDraft(defaultMethod),
  );
  const [ready, setReady] = useState(false);
  const [adHocId, setAdHocId] = useState(GUEST_DRAFT_ID);
  const [saveState, setSaveState] = useState<SaveState>("ad-hoc");
  const [activeSavedRequestId, setActiveSavedRequestId] = useState<string | null>(
    null,
  );
  const [breadcrumb, setBreadcrumb] = useState<string | null>(null);
  const dirtyRef = useRef(false);
  const activeSavedRequestIdRef = useRef<string | null>(null);
  const onPersistErrorRef = useRef(onPersistError);
  const persistRef = useRef<(next: RequestDraft) => Promise<void>>(async () => {});
  const debouncedPersistRef = useRef<DebouncedPersist | null>(null);
  const savedFlashTimerRef = useRef<number | null>(null);
  const projectServiceRef = useRef(projectService);

  useEffect(() => {
    onPersistErrorRef.current = onPersistError;
  }, [onPersistError]);

  useEffect(() => {
    projectServiceRef.current = projectService;
  }, [projectService]);

  useEffect(() => {
    activeSavedRequestIdRef.current = activeSavedRequestId;
  }, [activeSavedRequestId]);

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

  const clearSavedFlash = useCallback(() => {
    if (savedFlashTimerRef.current != null) {
      window.clearTimeout(savedFlashTimerRef.current);
      savedFlashTimerRef.current = null;
    }
  }, []);

  const markAdHocSaved = useCallback(() => {
    if (activeSavedRequestIdRef.current != null) return;
    setSaveState("saved");
    clearSavedFlash();
    savedFlashTimerRef.current = window.setTimeout(() => {
      if (activeSavedRequestIdRef.current == null) {
        setSaveState("ad-hoc");
      }
      savedFlashTimerRef.current = null;
    }, SAVED_FLASH_MS);
  }, [clearSavedFlash]);

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
        markAdHocSaved();
      } catch (error) {
        reportPersistError(error);
        if (activeSavedRequestIdRef.current == null) {
          setSaveState("unsaved");
        }
      }
    };
  }, [adHocId, markAdHocSaved, repository, reportPersistError]);

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
        setActiveSavedRequestId(null);
        setBreadcrumb(null);
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
      clearSavedFlash();
      setSaveState("unsaved");
      setDraftState((prev) => {
        const value = typeof next === "function" ? next(prev) : next;
        debouncedPersistRef.current?.(value);
        return value;
      });
    },
    [clearSavedFlash],
  );

  const clearSavedBinding = useCallback(() => {
    clearSavedFlash();
    setActiveSavedRequestId(null);
    setBreadcrumb(null);
    setSaveState("ad-hoc");
  }, [clearSavedFlash]);

  const bindSavedRequest = useCallback(
    async (request: SavedRequest) => {
      clearSavedFlash();
      setActiveSavedRequestId(request.id);
      setDraftState(request.draft);
      setSaveState("saved");

      const service = projectServiceRef.current;
      if (!service) {
        setBreadcrumb(null);
        return;
      }
      try {
        const crumb = await service.findBreadcrumb(request.id);
        setBreadcrumb(
          crumb ? `${crumb.projectName} / ${crumb.collectionName}` : null,
        );
      } catch {
        setBreadcrumb(null);
      }
    },
    [clearSavedFlash],
  );

  const startNewRequest = useCallback(() => {
    dirtyRef.current = true;
    clearSavedBinding();
    const empty = createEmptyDraft(defaultMethod);
    setDraftState(empty);
    debouncedPersistRef.current?.(empty);
  }, [clearSavedBinding, defaultMethod]);

  const openSavedRequest = useCallback(
    async (id: string): Promise<boolean> => {
      const service = projectServiceRef.current;
      if (!service) return false;
      try {
        const request = await service.getSavedRequest(id);
        if (!request) {
          reportPersistError(new Error("Saved request not found"));
          return false;
        }
        dirtyRef.current = true;
        await bindSavedRequest(request);
        debouncedPersistRef.current?.(request.draft);
        return true;
      } catch (error) {
        reportPersistError(error);
        return false;
      }
    },
    [bindSavedRequest, reportPersistError],
  );

  const persistSavedIfBound = useCallback(async (): Promise<boolean> => {
    const id = activeSavedRequestIdRef.current;
    const service = projectServiceRef.current;
    if (!id || !service) return false;

    try {
      const result = await service.updateSavedRequest(id, draft);
      if (result.status !== "ok") {
        reportPersistError(new Error("Failed to update saved request"));
        return false;
      }
      clearSavedFlash();
      setSaveState("saved");
      return true;
    } catch (error) {
      reportPersistError(error);
      return false;
    }
  }, [clearSavedFlash, draft, reportPersistError]);

  return {
    draft,
    setDraft,
    startNewRequest,
    openSavedRequest,
    bindSavedRequest,
    persistSavedIfBound,
    activeSavedRequestId,
    breadcrumb,
    ready,
    saveState,
  };
}
