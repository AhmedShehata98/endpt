import { useCallback, useMemo, useRef, useState } from "react";
import {
  resolveDraft,
  type EnvBinding,
  type EnvironmentVariable,
} from "@modules/environment";
import { RequestService, type RequestDraft } from "@modules/request";
import type { ResponseView } from "@modules/response";
import { createRequestService } from "@/app/composition";
import type { SendState } from "@/app/workspace-state";

interface UseWorkspaceSendOptions {
  variables: readonly EnvironmentVariable[];
}

export function useWorkspaceSend({ variables }: UseWorkspaceSendOptions) {
  const [send, setSend] = useState<SendState>({ status: "idle" });
  const [lastHttpResponse, setLastHttpResponse] = useState<ResponseView | null>(null);
  const sendingRef = useRef(false);
  const serviceRef = useRef<RequestService | null>(null);
  if (serviceRef.current === null) {
    serviceRef.current = createRequestService();
  }
  const requestService = serviceRef.current;

  const bindings = useMemo(() => toEnvBindings(variables), [variables]);

  const definedKeys = useMemo(
    () => new Set(bindings.map((binding) => binding.key)),
    [bindings],
  );

  const unresolvedForDraft = useCallback(
    (draft: RequestDraft): string[] => resolveDraft(draft, bindings).unresolved,
    [bindings],
  );

  const sendDraft = useCallback(
    async (draft: RequestDraft) => {
      if (sendingRef.current) return;
      sendingRef.current = true;
      setSend({ status: "sending", startedAt: Date.now() });

      try {
        const result = await requestService.send(draft, bindings);
        if (result.status === "superseded") return;

        if (result.status === "invalid") {
          setSend({ status: "invalid", issues: result.issues });
          return;
        }

        if (result.status === "network-error") {
          setSend({
            status: "network-error",
            message: result.message,
            durationMs: result.durationMs,
          });
          return;
        }

        setLastHttpResponse(result.response);
        setSend({ status: "http-response", response: result.response });
      } finally {
        sendingRef.current = false;
      }
    },
    [bindings, requestService],
  );

  const responseForView = useMemo((): ResponseView | null => {
    if (send.status === "http-response") return send.response;
    return lastHttpResponse;
  }, [lastHttpResponse, send]);

  const showPreviousResponse = send.status === "sending" && lastHttpResponse !== null;

  return {
    send,
    sendDraft,
    responseForView,
    showPreviousResponse,
    definedKeys,
    unresolvedForDraft,
  };
}

function toEnvBindings(variables: readonly EnvironmentVariable[]): EnvBinding[] {
  return variables.map((variable) => ({
    key: variable.key,
    value: variable.value,
  }));
}
