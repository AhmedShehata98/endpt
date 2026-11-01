import { createFileRoute } from "@tanstack/react-router";
import { MethodBadge, SplitPanel } from "@/components";
import { RequestBuilderPanel } from "@/views/workspace/RequestBuilderPanel";
import { ResponsePanel } from "@/views/workspace/ResponsePanel";
import { useApplicationContext } from "@/state-management/application-context";

export const Route = createFileRoute("/application/workspace")({
  component: RouteComponent,
});

function RouteComponent() {
  const {
    draft,
    setDraft,
    send,
    responseForView,
    showPreviousResponse,
    envValues,
    wrapLines,
    setWrapLines,
    sendCurrentDraft,
    openVariables,
    openFullscreen,
    handleCopyResult,
    fullscreenTriggerRef,
  } = useApplicationContext();

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
            onDraftChange={setDraft}
            send={send}
            envValues={envValues}
            onSend={sendCurrentDraft}
            onFixVariable={(key) => openVariables(key)}
          />
        }
        bottom={
          <ResponsePanel
            ref={fullscreenTriggerRef}
            send={send}
            response={responseForView}
            showPreviousResponse={showPreviousResponse}
            wrapLines={wrapLines}
            onWrapLinesChange={setWrapLines}
            onOpenFullscreen={openFullscreen}
            onTryAgain={sendCurrentDraft}
            onCopyResult={handleCopyResult}
          />
        }
      />
    </div>
  );
}
