import { useCallback, useEffect, useRef, useState } from "react";
import type { EnvironmentVariable } from "@modules/environment";
import type { EnvironmentVariableRepository } from "@modules/environment";
import { MOCK_ENV_VARS } from "@/app/mock-data";
import { debounce } from "@/lib/debounce";

const ENV_DEBOUNCE_MS = 400;

function nowIso(): string {
  return new Date().toISOString();
}

export function useEnvironmentVariables(repository: EnvironmentVariableRepository | null) {
  const [variables, setVariablesState] = useState<EnvironmentVariable[]>([]);
  const [ready, setReady] = useState(false);

  const persistAll = useCallback(
    async (next: EnvironmentVariable[]) => {
      if (!repository) return;
      for (const variable of next) {
        await repository.save({ ...variable, updatedAt: nowIso(), deletedAt: null });
      }
    },
    [repository],
  );

  const debouncedPersist = useRef(
    debounce((next: EnvironmentVariable[]) => {
      void persistAll(next);
    }, ENV_DEBOUNCE_MS),
  );

  useEffect(() => {
    debouncedPersist.current = debounce((next: EnvironmentVariable[]) => {
      void persistAll(next);
    }, ENV_DEBOUNCE_MS);
    return () => debouncedPersist.current.cancel();
  }, [persistAll]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!repository) {
        setReady(false);
        return;
      }
      const existing = await repository.listByUserId(null);
      if (cancelled) return;
      if (existing.length === 0) {
        const seeded = MOCK_ENV_VARS.map((v) => ({ ...v, updatedAt: nowIso() }));
        for (const variable of seeded) {
          await repository.save(variable);
        }
        if (cancelled) return;
        setVariablesState(seeded);
      } else {
        setVariablesState(existing);
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
        debouncedPersist.current(value);
        return value;
      });
    },
    [],
  );

  return { variables, setVariables, ready };
}
