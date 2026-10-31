import { useState } from "react";
import { Button, Dialog, Input, SecretInput } from "@/components";

interface CloudLinkDialogProps {
  open: boolean;
  email: string;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: (password: string) => void;
}

export function CloudLinkDialog({
  open,
  email,
  busy = false,
  error = null,
  onClose,
  onConfirm,
}: CloudLinkDialogProps) {
  if (!open) return null;
  return (
    <CloudLinkDialogForm
      key={email}
      email={email}
      busy={busy}
      error={error}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}

function CloudLinkDialogForm({
  email,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  email: string;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (password: string) => void;
}) {
  const [password, setPassword] = useState("");

  return (
    <Dialog
      open
      title="Link cloud account"
      onClose={busy ? () => undefined : onClose}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={busy || password.length < 8}
            onClick={() => onConfirm(password)}
          >
            {busy ? "Linking…" : "Link and sync"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-[0.8125rem] text-text-secondary">
          Confirm your password to link this local account to Firebase with the same
          email and password.
        </p>
        <label className="block space-y-1">
          <span className="text-[0.75rem] text-text-muted">Email</span>
          <Input value={email} readOnly aria-label="Account email" />
        </label>
        <label className="block space-y-1">
          <span className="text-[0.75rem] text-text-muted">Password</span>
          <SecretInput
            value={password}
            onChange={setPassword}
            aria-label="Account password"
            disabled={busy}
          />
        </label>
        {error ? <p className="text-[0.75rem] text-error">{error}</p> : null}
      </div>
    </Dialog>
  );
}
