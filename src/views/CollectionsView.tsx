import { useState } from "react";
import { Button, EmptyState, MethodBadge } from "@/components";
import { MOCK_COLLECTION_TREE } from "@/app/mock-data";
import type { HttpMethod } from "@modules/request";

interface CollectionsViewProps {
  signedIn: boolean;
  onSignIn: () => void;
  onOpenRequest: (name: string, method: HttpMethod) => void;
}

export function CollectionsView({ signedIn, onSignIn, onOpenRequest }: CollectionsViewProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    "proj-1": true,
    "col-1": true,
  });

  if (!signedIn) {
    return (
      <EmptyState
        title="Sign in to organize requests"
        description="Sign in to create projects and collections. Ad-hoc requests in Workspace still work without an account."
        action={
          <Button variant="primary" onClick={onSignIn}>
            Sign in
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex h-full flex-col bg-bg-surface">
      <div className="flex h-12 items-center justify-between border-b border-border-default px-4">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Collections</h2>
          <p className="text-[0.75rem] text-text-muted">Project → Collection → Request</p>
        </div>
        <Button variant="secondary" size="sm">
          New project
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {MOCK_COLLECTION_TREE.map((project) => {
          const projectOpen = expanded[project.id] ?? false;
          return (
            <div key={project.id} className="mb-2">
              <button
                type="button"
                className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm font-medium text-text-primary hover:bg-bg-subtle"
                onClick={() =>
                  setExpanded((s) => ({ ...s, [project.id]: !projectOpen }))
                }
              >
                <span className="w-3 text-text-muted">{projectOpen ? "▾" : "▸"}</span>
                {project.name}
              </button>
              {projectOpen &&
                project.collections.map((collection) => {
                  const colOpen = expanded[collection.id] ?? false;
                  return (
                    <div key={collection.id} className="ml-3">
                      <button
                        type="button"
                        className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[0.8125rem] text-text-secondary hover:bg-bg-subtle hover:text-text-primary"
                        onClick={() =>
                          setExpanded((s) => ({ ...s, [collection.id]: !colOpen }))
                        }
                      >
                        <span className="w-3 text-text-muted">{colOpen ? "▾" : "▸"}</span>
                        {collection.name}
                      </button>
                      {colOpen &&
                        collection.requests.map((request) => (
                          <button
                            key={request.id}
                            type="button"
                            className="ml-5 flex h-8 w-[calc(100%-1.25rem)] items-center gap-2 rounded-md px-2 text-left hover:bg-accent-subtle"
                            onClick={() => onOpenRequest(request.name, request.method)}
                          >
                            <MethodBadge method={request.method} />
                            <span className="truncate font-mono text-[0.75rem] text-text-primary">
                              {request.name}
                            </span>
                          </button>
                        ))}
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
