import { useMemo, useState } from "react";
import type { ProjectNode } from "@modules/project";
import type { RequestDraft, SavedRequest } from "@modules/request";
import { Button, Dialog, Input, Select } from "@/components";

interface SaveRequestDialogProps {
  open: boolean;
  signedIn: boolean;
  draft: RequestDraft;
  tree: ProjectNode[];
  busy: boolean;
  onClose: () => void;
  onSignIn: () => void;
  onCreateProject: (
    name: string,
    description?: string | null,
  ) => Promise<{ status: string; project?: { id: string } } | null>;
  onCreateCollection: (
    projectId: string,
    name: string,
    description?: string | null,
  ) => Promise<{ status: string; collection?: { id: string } } | null>;
  onSave: (
    collectionId: string,
    name: string,
  ) => Promise<{ status: string; request?: SavedRequest } | null>;
}

export function SaveRequestDialog(props: SaveRequestDialogProps) {
  if (!props.open) return null;
  return <SaveRequestDialogBody {...props} />;
}

function SaveRequestDialogBody({
  signedIn,
  draft,
  tree,
  busy,
  onClose,
  onSignIn,
  onCreateProject,
  onCreateCollection,
  onSave,
}: SaveRequestDialogProps) {
  const [name, setName] = useState(draft.name ?? "");
  const [projectId, setProjectId] = useState(tree[0]?.project.id ?? "");
  const [collectionId, setCollectionId] = useState(
    tree[0]?.collections[0]?.collection.id ?? "",
  );
  const [creatingProject, setCreatingProject] = useState(false);
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newCollectionName, setNewCollectionName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selectedProjectId = projectId || tree[0]?.project.id || "";
  const collections = useMemo(() => {
    const node = tree.find((item) => item.project.id === selectedProjectId);
    return node?.collections ?? [];
  }, [selectedProjectId, tree]);

  const selectedCollectionId = collections.some(
    (item) => item.collection.id === collectionId,
  )
    ? collectionId
    : (collections[0]?.collection.id ?? "");

  async function handleCreateProject() {
    const trimmed = newProjectName.trim();
    if (!trimmed) {
      setError("Project name is required.");
      return;
    }
    const result = await onCreateProject(trimmed);
    if (!result || result.status !== "ok" || !result.project) {
      setError(
        result && "message" in result
          ? String((result as { message?: string }).message ?? "Could not create project.")
          : "Could not create project.",
      );
      return;
    }
    setProjectId(result.project.id);
    setCollectionId("");
    setCreatingProject(false);
    setNewProjectName("");
    setCreatingCollection(true);
    setError(null);
  }

  async function handleCreateCollection() {
    if (!selectedProjectId) {
      setError("Select or create a project first.");
      return;
    }
    const trimmed = newCollectionName.trim();
    if (!trimmed) {
      setError("Collection name is required.");
      return;
    }
    const result = await onCreateCollection(selectedProjectId, trimmed);
    if (!result || result.status !== "ok" || !result.collection) {
      setError(
        result && "message" in result
          ? String(
              (result as { message?: string }).message ?? "Could not create collection.",
            )
          : "Could not create collection.",
      );
      return;
    }
    setCollectionId(result.collection.id);
    setCreatingCollection(false);
    setNewCollectionName("");
    setError(null);
  }

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Request name is required.");
      return;
    }
    if (!selectedCollectionId) {
      setError("Select or create a collection.");
      return;
    }
    const result = await onSave(selectedCollectionId, trimmed);
    if (!result || result.status !== "ok") {
      setError(
        result && "message" in result
          ? String((result as { message?: string }).message ?? "Could not save request.")
          : "Could not save request.",
      );
      return;
    }
    onClose();
  }

  return (
    <Dialog
      open
      title="Save request"
      onClose={onClose}
      footer={
        signedIn ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void handleSave()} disabled={busy}>
              Save
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={onSignIn}>
              Sign in
            </Button>
          </>
        )
      }
    >
      {!signedIn ? (
        <p className="text-sm text-text-secondary">
          Sign in to save this request into a project and collection. Your ad-hoc draft
          stays as it is.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[0.75rem] text-text-secondary">Request name</span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              invalid={Boolean(error) && !name.trim()}
              autoFocus
            />
          </label>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[0.75rem] text-text-secondary">Project</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCreatingProject((v) => !v);
                  setError(null);
                }}
              >
                {creatingProject ? "Cancel" : "New project"}
              </Button>
            </div>
            {creatingProject ? (
              <div className="flex gap-2">
                <Input
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Project name"
                />
                <Button
                  variant="secondary"
                  onClick={() => void handleCreateProject()}
                  disabled={busy}
                >
                  Add
                </Button>
              </div>
            ) : (
              <Select
                value={selectedProjectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setCollectionId("");
                }}
                className="w-full"
                disabled={tree.length === 0}
              >
                {tree.length === 0 ? (
                  <option value="">No projects yet</option>
                ) : (
                  tree.map((node) => (
                    <option key={node.project.id} value={node.project.id}>
                      {node.project.name}
                    </option>
                  ))
                )}
              </Select>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[0.75rem] text-text-secondary">Collection</span>
              <Button
                variant="ghost"
                size="sm"
                disabled={!selectedProjectId}
                onClick={() => {
                  setCreatingCollection((v) => !v);
                  setError(null);
                }}
              >
                {creatingCollection ? "Cancel" : "New collection"}
              </Button>
            </div>
            {creatingCollection ? (
              <div className="flex gap-2">
                <Input
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="Collection name"
                />
                <Button
                  variant="secondary"
                  onClick={() => void handleCreateCollection()}
                  disabled={busy}
                >
                  Add
                </Button>
              </div>
            ) : (
              <Select
                value={selectedCollectionId}
                onChange={(e) => setCollectionId(e.target.value)}
                className="w-full"
                disabled={collections.length === 0}
              >
                {collections.length === 0 ? (
                  <option value="">No collections yet</option>
                ) : (
                  collections.map(({ collection }) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))
                )}
              </Select>
            )}
          </div>

          {error && <p className="text-[0.75rem] text-error">{error}</p>}
        </div>
      )}
    </Dialog>
  );
}
