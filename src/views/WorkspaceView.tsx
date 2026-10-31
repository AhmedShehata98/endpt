import { MethodBadge, SplitPanel } from "@/components";
import type { RequestDraft } from "@modules/request";
import type { ResponseView } from "@modules/response";
import { RequestBuilderPanel } from "./workspace/RequestBuilderPanel";
import { ResponsePanel } from "./workspace/ResponsePanel";

interface WorkspaceViewProps {
  draft: RequestDraft;
  onDraftChange: (draft: RequestDraft) => void;
  response: ResponseView | null;
  wrapLines: boolean;
  onOpenFullscreen: () => void;
}

export function WorkspaceView({
  draft,
  onDraftChange,
  response,
  wrapLines,
  onOpenFullscreen,
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
        top={<RequestBuilderPanel draft={draft} onDraftChange={onDraftChange} />}
        bottom={
          <ResponsePanel
            response={response}
            wrapLines={wrapLines}
            onOpenFullscreen={onOpenFullscreen}
          />
        }
      />
    </div>
  );
}
