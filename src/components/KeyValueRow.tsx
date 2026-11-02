import { Input } from "./Input";
import { MentionInput } from "./MentionInput";
import { Button } from "./Button";
import { cn } from "@/lib/cn";
import { IoTrashOutline } from "react-icons/io5";

interface KeyValueRowProps {
  enabled: boolean;
  keyName: string;
  value: string;
  onEnabledChange: (enabled: boolean) => void;
  onKeyChange: (key: string) => void;
  onValueChange: (value: string) => void;
  onRemove: () => void;
  /** When set, value field offers `{{env}}` mention suggestions. */
  envValues?: ReadonlyMap<string, string>;
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
  envValues,
  className,
}: KeyValueRowProps) {
  const valueClassName =
    "h-7 border-transparent bg-transparent px-1.5 hover:border-border-default";

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
      {envValues ? (
        <MentionInput
          mono
          value={value}
          onChange={onValueChange}
          envValues={envValues}
          placeholder="Value"
          className={valueClassName}
        />
      ) : (
        <Input
          mono
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder="Value"
          className={valueClassName}
        />
      )}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 px-0 !bg-red-400/10 !text-red-700 group-hover:!bg-red-400/20"
        onClick={onRemove}
        aria-label="Remove row"
      >
        <IoTrashOutline className="text-red-500" size={16} />
      </Button>
    </div>
  );
}
