import { useEffect, useState } from "react";
import { Button, Dialog, Input } from "@/components";

interface JoinTeamDialogProps {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onJoin: (token: string) => void;
}

export function JoinTeamDialog({ open, busy, onClose, onJoin }: JoinTeamDialogProps) {
  const [token, setToken] = useState("");

  useEffect(() => {
    if (open) setToken("");
  }, [open]);

  return (
    <Dialog
      open={open}
      title="Join with token"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={busy || !token.trim()}
            onClick={() => onJoin(token.trim())}
          >
            Join team
          </Button>
        </>
      }
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-text-secondary">Invite token</span>
        <Input
          value={token}
          onChange={(event) => setToken(event.target.value)}
          mono
          autoFocus
        />
      </label>
    </Dialog>
  );
}
