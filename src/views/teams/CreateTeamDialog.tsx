import { useEffect, useState } from "react";
import { Button, Dialog, Input } from "@/components";

interface CreateTeamDialogProps {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

export function CreateTeamDialog({ open, busy, onClose, onCreate }: CreateTeamDialogProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) setName("");
  }, [open]);

  return (
    <Dialog
      open={open}
      title="Create team"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={busy || !name.trim()}
            onClick={() => onCreate(name.trim())}
          >
            Create team
          </Button>
        </>
      }
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-text-secondary">Team name</span>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          autoFocus
        />
      </label>
    </Dialog>
  );
}
