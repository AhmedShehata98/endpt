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
  definedKeys: ReadonlySet<string>;
  wrapLines: boolean;
  onSend: () => void;
  onFixVariable: () => void;
  onOpenFullscreen: () => void;
  onTryAgain: () => void;
}

export function WorkspaceView({
  draft,
  onDraftChange,
  send,
  response,
  showPreviousResponse,
  definedKeys,
  wrapLines,
  onSend,
  onFixVariable,
  onOpenFullscreen,
  onTryAgain,
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
            definedKeys={definedKeys}
            onSend={onSend}
            onFixVariable={onFixVariable}
          />
        }
        bottom={
          <ResponsePanel
            send={send}
            response={response}
            showPreviousResponse={showPreviousResponse}
            wrapLines={wrapLines}
            onOpenFullscreen={onOpenFullscreen}
            onTryAgain={onTryAgain}
          />
        }
      />
    </div>
  );
}
