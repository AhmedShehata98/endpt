import { useMemo, useState } from "react";
import type { CascadeCounts, CascadeTarget, ProjectNode } from "@modules/project";
import { Button, Dialog, EmptyState, Input, MethodBadge } from "@/components";

type NameDialogMode =
  | { kind: "create-project" }
  | { kind: "rename-project"; id: string; name: string; description: string }
  | { kind: "create-collection"; projectId: string }
  | {
      kind: "rename-collection";
      id: string;
      name: string;
      description: string;
    }
  | { kind: "rename-request"; id: string; name: string };

type DeleteDialogState = {
  target: CascadeTarget;
  title: string;
  counts: CascadeCounts;
};

interface CollectionsViewProps {
  signedIn: boolean;
  tree: ProjectNode[];
  ready: boolean;
  busy: boolean;
  onSignIn: () => void;
  onOpenRequest: (id: string) => void;
  onCreateProject: (
    name: string,
    description?: string | null,
  ) => Promise<unknown>;
  onRenameProject: (
    id: string,
    name: string,
    description?: string | null,
  ) => Promise<unknown>;
  onDeleteProject: (id: string) => Promise<unknown>;
  onCreateCollection: (
    projectId: string,
    name: string,
    description?: string | null,
  ) => Promise<unknown>;
  onRenameCollection: (
    id: string,
    name: string,
    description?: string | null,
  ) => Promise<unknown>;
  onDeleteCollection: (id: string) => Promise<unknown>;
  onRenameRequest: (id: string, name: string) => Promise<unknown>;
  onDeleteRequest: (id: string) => Promise<unknown>;
  onCountCascade: (target: CascadeTarget) => Promise<CascadeCounts | null>;
}

export function CollectionsView({
  signedIn,
  tree,
  ready,
  busy,
  onSignIn,
  onOpenRequest,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onCreateCollection,
  onRenameCollection,
  onDeleteCollection,
  onRenameRequest,
  onDeleteRequest,
  onCountCascade,
}: CollectionsViewProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [nameDialog, setNameDialog] = useState<NameDialogMode | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const isEmpty = tree.length === 0;

  const nameDialogTitle = useMemo(() => {
    if (!nameDialog) return "";
    switch (nameDialog.kind) {
      case "create-project":
        return "New project";
      case "rename-project":
        return "Rename project";
      case "create-collection":
        return "New collection";
      case "rename-collection":
        return "Rename collection";
      case "rename-request":
        return "Rename request";
    }
  }, [nameDialog]);

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

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-text-secondary">
        Loading collections…
      </div>
    );
  }

  function openCreateProject() {
    setFormError(null);
    setName("");
    setDescription("");
    setNameDialog({ kind: "create-project" });
  }

  function openRenameProject(node: ProjectNode) {
    setFormError(null);
    setName(node.project.name);
    setDescription(node.project.description ?? "");
    setNameDialog({
      kind: "rename-project",
      id: node.project.id,
      name: node.project.name,
      description: node.project.description ?? "",
    });
  }

  function openCreateCollection(projectId: string) {
    setFormError(null);
    setName("");
    setDescription("");
    setNameDialog({ kind: "create-collection", projectId });
    setExpanded((s) => ({ ...s, [projectId]: true }));
  }

  function openRenameCollection(
    id: string,
    currentName: string,
    currentDescription: string | null,
  ) {
    setFormError(null);
    setName(currentName);
    setDescription(currentDescription ?? "");
    setNameDialog({
      kind: "rename-collection",
      id,
      name: currentName,
      description: currentDescription ?? "",
    });
  }

  function openRenameRequest(id: string, currentName: string) {
    setFormError(null);
    setName(currentName);
    setDescription("");
    setNameDialog({ kind: "rename-request", id, name: currentName });
  }

  async function openDelete(target: CascadeTarget, title: string) {
    const counts = await onCountCascade(target);
    if (!counts) return;
    setDeleteDialog({ target, title, counts });
  }

  async function submitNameDialog() {
    if (!nameDialog) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError("Name is required.");
      return;
    }

    let result: unknown = null;
    switch (nameDialog.kind) {
      case "create-project":
        result = await onCreateProject(trimmed, description);
        break;
      case "rename-project":
        result = await onRenameProject(nameDialog.id, trimmed, description);
        break;
      case "create-collection":
        result = await onCreateCollection(nameDialog.projectId, trimmed, description);
        break;
      case "rename-collection":
        result = await onRenameCollection(nameDialog.id, trimmed, description);
        break;
      case "rename-request":
        result = await onRenameRequest(nameDialog.id, trimmed);
        break;
    }

    if (
      result &&
      typeof result === "object" &&
      "status" in result &&
      (result as { status: string }).status === "invalid"
    ) {
      setFormError((result as { message?: string }).message ?? "Invalid name.");
      return;
    }

    if (result == null) return;
    setNameDialog(null);
  }

  async function confirmDelete() {
    if (!deleteDialog) return;
    const { target } = deleteDialog;
    if (target.kind === "project") await onDeleteProject(target.id);
    if (target.kind === "collection") await onDeleteCollection(target.id);
    if (target.kind === "request") await onDeleteRequest(target.id);
    setDeleteDialog(null);
  }

  function deleteCopy(counts: CascadeCounts, kind: CascadeTarget["kind"]): string {
    if (kind === "project") {
      return `Deletes ${counts.collections} collection${counts.collections === 1 ? "" : "s"} and ${counts.requests} request${counts.requests === 1 ? "" : "s"}.`;
    }
    if (kind === "collection") {
      return `Deletes ${counts.requests} request${counts.requests === 1 ? "" : "s"}.`;
    }
    return "This request will be removed from the collection.";
  }

  return (
    <div className="flex h-full flex-col bg-bg-surface">
      <div className="flex h-12 items-center justify-between border-b border-border-default px-4">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Collections</h2>
          <p className="text-[0.75rem] text-text-muted">Project → Collection → Request</p>
        </div>
        <Button variant="secondary" size="sm" onClick={openCreateProject} disabled={busy}>
          New project
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {isEmpty ? (
          <EmptyState
            title="No projects yet"
            description="Create a project to organize saved requests into collections."
            action={
              <Button variant="primary" onClick={openCreateProject}>
                New project
              </Button>
            }
          />
        ) : (
          tree.map((node) => {
            const projectOpen = expanded[node.project.id] ?? false;
            return (
              <div key={node.project.id} className="mb-2">
                <div className="group flex h-8 items-center gap-1 rounded-md px-1 hover:bg-bg-subtle">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 px-1 text-left text-sm font-medium text-text-primary"
                    onClick={() =>
                      setExpanded((s) => ({
                        ...s,
                        [node.project.id]: !projectOpen,
                      }))
                    }
                  >
                    <span className="w-3 text-text-muted">{projectOpen ? "▾" : "▸"}</span>
                    <span className="truncate">{node.project.name}</span>
                  </button>
                  <RowActions
                    onAdd={() => openCreateCollection(node.project.id)}
                    addLabel="New collection"
                    onRename={() => openRenameProject(node)}
                    onDelete={() =>
                      void openDelete(
                        { kind: "project", id: node.project.id },
                        node.project.name,
                      )
                    }
                  />
                </div>

                {projectOpen && (
                  <div className="ml-3">
                    {node.collections.length === 0 ? (
                      <p className="px-2 py-1 text-[0.75rem] text-text-muted">
                        No collections yet.
                      </p>
                    ) : (
                      node.collections.map(({ collection, requests }) => {
                        const colOpen = expanded[collection.id] ?? false;
                        return (
                          <div key={collection.id}>
                            <div className="group flex h-8 items-center gap-1 rounded-md px-1 hover:bg-bg-subtle">
                              <button
                                type="button"
                                className="flex min-w-0 flex-1 items-center gap-2 px-1 text-left text-[0.8125rem] text-text-secondary hover:text-text-primary"
                                onClick={() =>
                                  setExpanded((s) => ({
                                    ...s,
                                    [collection.id]: !colOpen,
                                  }))
                                }
                              >
                                <span className="w-3 text-text-muted">
                                  {colOpen ? "▾" : "▸"}
                                </span>
                                <span className="truncate">{collection.name}</span>
                              </button>
                              <RowActions
                                onRename={() =>
                                  openRenameCollection(
                                    collection.id,
                                    collection.name,
                                    collection.description,
                                  )
                                }
                                onDelete={() =>
                                  void openDelete(
                                    { kind: "collection", id: collection.id },
                                    collection.name,
                                  )
                                }
                              />
                            </div>

                            {colOpen && (
                              <div className="ml-5">
                                {requests.length === 0 ? (
                                  <p className="px-2 py-1 text-[0.75rem] text-text-muted">
                                    No requests yet.
                                  </p>
                                ) : (
                                  requests.map((request) => (
                                    <div
                                      key={request.id}
                                      className="group flex h-8 items-center gap-1 rounded-md hover:bg-accent-subtle"
                                    >
                                      <button
                                        type="button"
                                        className="flex min-w-0 flex-1 items-center gap-2 px-2 text-left"
                                        onClick={() => onOpenRequest(request.id)}
                                      >
                                        <MethodBadge method={request.draft.method} />
                                        <span className="truncate font-mono text-[0.75rem] text-text-primary">
                                          {request.draft.name ?? "Untitled Request"}
                                        </span>
                                      </button>
                                      <RowActions
                                        onRename={() =>
                                          openRenameRequest(
                                            request.id,
                                            request.draft.name ?? "Untitled Request",
                                          )
                                        }
                                        onDelete={() =>
                                          void openDelete(
                                            { kind: "request", id: request.id },
                                            request.draft.name ?? "Untitled Request",
                                          )
                                        }
                                      />
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <Dialog
        open={nameDialog != null}
        title={nameDialogTitle}
        onClose={() => setNameDialog(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setNameDialog(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void submitNameDialog()} disabled={busy}>
              Save
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[0.75rem] text-text-secondary">Name</span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              invalid={Boolean(formError)}
              autoFocus
            />
          </label>
          {nameDialog?.kind !== "rename-request" && (
            <label className="flex flex-col gap-1">
              <span className="text-[0.75rem] text-text-secondary">
                Description (optional)
              </span>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
          )}
          {formError && <p className="text-[0.75rem] text-error">{formError}</p>}
        </div>
      </Dialog>

      <Dialog
        open={deleteDialog != null}
        title={deleteDialog ? `Delete “${deleteDialog.title}”?` : "Delete"}
        onClose={() => setDeleteDialog(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmDelete()}
              disabled={busy}
            >
              Delete
            </Button>
          </>
        }
      >
        {deleteDialog && (
          <p className="text-sm text-text-secondary">
            {deleteCopy(deleteDialog.counts, deleteDialog.target.kind)} This cannot be
            undone from the Collections view.
          </p>
        )}
      </Dialog>
    </div>
  );
}

function RowActions({
  onAdd,
  addLabel,
  onRename,
  onDelete,
}: {
  onAdd?: () => void;
  addLabel?: string;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
      {onAdd && (
        <Button variant="ghost" size="sm" onClick={onAdd} aria-label={addLabel}>
          +
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={onRename} aria-label="Rename">
        ✎
      </Button>
      <Button variant="ghost" size="sm" onClick={onDelete} aria-label="Delete">
        ×
      </Button>
    </div>
  );
}
