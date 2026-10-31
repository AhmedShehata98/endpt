import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CascadeCounts,
  CascadeTarget,
  ProjectNode,
  ProjectService,
} from "@modules/project";
import type { RequestDraft } from "@modules/request";

interface UseProjectsOptions {
  service: ProjectService | null;
  signedIn: boolean;
  userId: string | null;
  onError?: (message: string) => void;
}

export function useProjects({
  service,
  signedIn,
  userId,
  onError,
}: UseProjectsOptions) {
  const [tree, setTree] = useState<ProjectNode[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const reportError = useCallback((error: unknown, fallback: string) => {
    const message = error instanceof Error ? error.message : fallback;
    onErrorRef.current?.(message);
  }, []);

  const refresh = useCallback(async () => {
    if (!service || !signedIn || !userId) {
      setTree([]);
      setReady(true);
      return;
    }

    try {
      const next = await service.listTree(userId);
      setTree(next);
      setReady(true);
    } catch (error) {
      reportError(error, "Failed to load projects");
      setReady(false);
    }
  }, [reportError, service, signedIn, userId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!service || !signedIn || !userId) {
        if (!cancelled) {
          setTree([]);
          setReady(Boolean(service));
        }
        return;
      }

      setReady(false);
      try {
        const next = await service.listTree(userId);
        if (!cancelled) {
          setTree(next);
          setReady(true);
        }
      } catch (error) {
        if (!cancelled) {
          reportError(error, "Failed to load projects");
          setReady(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [reportError, service, signedIn, userId]);

  const runMutation = useCallback(
    async <T>(
      action: () => Promise<T>,
      fallback: string,
    ): Promise<T | null> => {
      if (!service) return null;
      setBusy(true);
      try {
        const result = await action();
        await refresh();
        return result;
      } catch (error) {
        reportError(error, fallback);
        return null;
      } finally {
        setBusy(false);
      }
    },
    [refresh, reportError, service],
  );

  const createProject = useCallback(
    async (name: string, description?: string | null) => {
      if (!service || !userId) return null;
      return runMutation(
        () => service.createProject({ userId, name, description }),
        "Failed to create project",
      );
    },
    [runMutation, service, userId],
  );

  const renameProject = useCallback(
    async (id: string, name: string, description?: string | null) => {
      if (!service) return null;
      return runMutation(
        () => service.renameProject({ id, name, description }),
        "Failed to rename project",
      );
    },
    [runMutation, service],
  );

  const deleteProject = useCallback(
    async (id: string) => {
      if (!service) return null;
      return runMutation(() => service.deleteProject(id), "Failed to delete project");
    },
    [runMutation, service],
  );

  const createCollection = useCallback(
    async (projectId: string, name: string, description?: string | null) => {
      if (!service) return null;
      return runMutation(
        () => service.createCollection({ projectId, name, description }),
        "Failed to create collection",
      );
    },
    [runMutation, service],
  );

  const renameCollection = useCallback(
    async (id: string, name: string, description?: string | null) => {
      if (!service) return null;
      return runMutation(
        () => service.renameCollection({ id, name, description }),
        "Failed to rename collection",
      );
    },
    [runMutation, service],
  );

  const deleteCollection = useCallback(
    async (id: string) => {
      if (!service) return null;
      return runMutation(
        () => service.deleteCollection(id),
        "Failed to delete collection",
      );
    },
    [runMutation, service],
  );

  const saveRequest = useCallback(
    async (collectionId: string, draft: RequestDraft, name: string) => {
      if (!service) return null;
      return runMutation(
        () => service.saveRequest({ collectionId, draft, name }),
        "Failed to save request",
      );
    },
    [runMutation, service],
  );

  const renameSavedRequest = useCallback(
    async (id: string, name: string) => {
      if (!service) return null;
      return runMutation(
        () => service.renameSavedRequest({ id, name }),
        "Failed to rename request",
      );
    },
    [runMutation, service],
  );

  const deleteSavedRequest = useCallback(
    async (id: string) => {
      if (!service) return null;
      return runMutation(
        () => service.deleteSavedRequest(id),
        "Failed to delete request",
      );
    },
    [runMutation, service],
  );

  const countCascade = useCallback(
    async (target: CascadeTarget): Promise<CascadeCounts | null> => {
      if (!service) return null;
      try {
        return await service.countCascade(target);
      } catch (error) {
        reportError(error, "Failed to prepare delete confirmation");
        return null;
      }
    },
    [reportError, service],
  );

  return {
    tree,
    ready,
    busy,
    refresh,
    createProject,
    renameProject,
    deleteProject,
    createCollection,
    renameCollection,
    deleteCollection,
    saveRequest,
    renameSavedRequest,
    deleteSavedRequest,
    countCascade,
  };
}
