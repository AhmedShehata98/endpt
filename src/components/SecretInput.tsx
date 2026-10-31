import { useState } from "react";
import { Input } from "./Input";
import { cn } from "@/lib/cn";

interface SecretInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}

export function SecretInput({
  id,
  value,
  onChange,
  placeholder,
  className,
  "aria-label": ariaLabel,
}: SecretInputProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className={cn("relative", className)}>
      <Input
        id={id}
        type={revealed ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        mono
        aria-label={ariaLabel}
        className="pr-9"
        autoComplete="off"
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-text-muted hover:text-text-primary"
        onClick={() => setRevealed((v) => !v)}
        aria-label={revealed ? "Hide value" : "Reveal value"}
      >
        <span className="text-xs">{revealed ? "Hide" : "Show"}</span>
      </button>
    </div>
  );
}
