import { Input } from "./Input";
import { Button } from "./Button";
import { cn } from "@/lib/cn";

interface KeyValueRowProps {
  enabled: boolean;
  keyName: string;
  value: string;
  onEnabledChange: (enabled: boolean) => void;
  onKeyChange: (key: string) => void;
  onValueChange: (value: string) => void;
  onRemove: () => void;
  className?: string;
}

export function KeyValueRow({
  enabled,
  keyName,
  value,
  onEnabledChange,
  onKeyChange,
  onValueChange,
  onRemove,
  className,
}: KeyValueRowProps) {
  return (
    <div
      className={cn(
        "group grid h-8 grid-cols-[28px_1fr_1fr_28px] items-center gap-1 border-b border-border-subtle px-1",
        className,
      )}
    >
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onEnabledChange(e.target.checked)}
        aria-label="Include row"
        className="mx-auto size-3.5 accent-accent"
      />
      <Input
        mono
        value={keyName}
        onChange={(e) => onKeyChange(e.target.value)}
        placeholder="Key"
        className="h-7 border-transparent bg-transparent px-1.5 hover:border-border-default"
      />
      <Input
        mono
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder="Value"
        className="h-7 border-transparent bg-transparent px-1.5 hover:border-border-default"
      />
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 px-0 opacity-0 group-hover:opacity-100"
        onClick={onRemove}
        aria-label="Remove row"
      >
        ×
      </Button>
    </div>
  );
}
