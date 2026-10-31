import { useCallback, useEffect, useRef, useState } from "react";
import {
  DuplicateEnvKeyError,
  type EnvironmentVariable,
  type EnvironmentVariableRepository,
} from "@modules/environment";
import { debounce } from "@/lib/debounce";
import { nowIso } from "@/lib/time";

const ENV_DEBOUNCE_MS = 400;

type DebouncedPersist = ReturnType<typeof debounce<[EnvironmentVariable[]]>>;

interface UseEnvironmentVariablesOptions {
  repository: EnvironmentVariableRepository | null;
  onPersistError?: (message: string) => void;
}

export function useEnvironmentVariables({
  repository,
  onPersistError,
}: UseEnvironmentVariablesOptions) {
  const [variables, setVariablesState] = useState<EnvironmentVariable[]>([]);
  const [ready, setReady] = useState(false);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const onPersistErrorRef = useRef(onPersistError);
  const persistAllRef = useRef<(next: EnvironmentVariable[]) => Promise<void>>(
    async () => {},
  );
  const debouncedPersistRef = useRef<DebouncedPersist | null>(null);

  useEffect(() => {
    onPersistErrorRef.current = onPersistError;
  }, [onPersistError]);

  const reportPersistError = useCallback((error: unknown) => {
    const message =
      error instanceof DuplicateEnvKeyError
        ? "That key is already in use"
        : error instanceof Error
          ? error.message
          : "Failed to save environment variables";
    onPersistErrorRef.current?.(message);
  }, []);

  useEffect(() => {
    persistAllRef.current = async (next: EnvironmentVariable[]) => {
      if (!repository) return;
      const stamp = nowIso();
      const nextIds = new Set(next.map((variable) => variable.id));

      try {
        for (const id of knownIdsRef.current) {
          if (!nextIds.has(id)) {
            await repository.softDelete(id, stamp);
          }
        }
        for (const variable of next) {
          await repository.save({
            ...variable,
            updatedAt: stamp,
            deletedAt: null,
          });
        }
        knownIdsRef.current = nextIds;
      } catch (error) {
        reportPersistError(error);
      }
    };
  }, [repository, reportPersistError]);

  useEffect(() => {
    debouncedPersistRef.current = debounce((next: EnvironmentVariable[]) => {
      void persistAllRef.current(next);
    }, ENV_DEBOUNCE_MS);
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
        const existing = await repository.listByUserId(null);
        if (cancelled) return;
        knownIdsRef.current = new Set(existing.map((variable) => variable.id));
        setVariablesState(existing);
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
  }, [repository, reportPersistError]);

  useEffect(() => {
    const flush = () => debouncedPersistRef.current?.flush();
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  const setVariables = useCallback(
    (
      next:
        | EnvironmentVariable[]
        | ((prev: EnvironmentVariable[]) => EnvironmentVariable[]),
    ) => {
      setVariablesState((prev) => {
        const value = typeof next === "function" ? next(prev) : next;
        debouncedPersistRef.current?.(value);
        return value;
      });
    },
    [],
  );

  return { variables, setVariables, ready };
}
