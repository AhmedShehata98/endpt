import type { Ref } from "react";
import { MethodBadge, SplitPanel } from "@/components";
import type { RequestDraft } from "@modules/request";
import type { ResponseView } from "@modules/response";
import type { SendState } from "@/app/workspace-state";
import { RequestBuilderPanel } from "./workspace/RequestBuilderPanel";
import { ResponsePanel } from "./workspace/ResponsePanel";

interface WorkspaceViewProps {
  draft: RequestDraft;
  onDraftChange: (draft: RequestDraft) => void;
  send: SendState;
  response: ResponseView | null;
  showPreviousResponse: boolean;
  envValues: ReadonlyMap<string, string>;
  wrapLines: boolean;
  onWrapLinesChange: (wrap: boolean) => void;
  onSend: () => void;
  onFixVariable: (key: string) => void;
  onOpenFullscreen: () => void;
  onTryAgain: () => void;
  onCopyResult: (ok: boolean) => void;
  fullscreenTriggerRef: Ref<HTMLButtonElement>;
}

export function WorkspaceView({
  draft,
  onDraftChange,
  send,
  response,
  showPreviousResponse,
  envValues,
  wrapLines,
  onWrapLinesChange,
  onSend,
  onFixVariable,
  onOpenFullscreen,
  onTryAgain,
  onCopyResult,
  fullscreenTriggerRef,
}: WorkspaceViewProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border-subtle bg-bg-surface px-3 py-2">
        <MethodBadge method={draft.method} />
        <span className="text-[0.8125rem] text-text-secondary">
          {draft.name ?? "Untitled Request"}
        </span>
      </div>
      <SplitPanel
        top={
          <RequestBuilderPanel
            draft={draft}
            onDraftChange={onDraftChange}
            send={send}
            envValues={envValues}
            onSend={onSend}
            onFixVariable={onFixVariable}
          />
        }
        bottom={
          <ResponsePanel
            ref={fullscreenTriggerRef}
            send={send}
            response={response}
            showPreviousResponse={showPreviousResponse}
            wrapLines={wrapLines}
            onWrapLinesChange={onWrapLinesChange}
            onOpenFullscreen={onOpenFullscreen}
            onTryAgain={onTryAgain}
            onCopyResult={onCopyResult}
          />
        }
      />
    </div>
  );
}
