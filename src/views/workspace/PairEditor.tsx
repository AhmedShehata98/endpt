import { Button, KeyValueRow } from "@/components";
import type { KeyValuePair } from "@modules/request";
import { PlaceholderHints } from "./PlaceholderHints";
import { HiPlusCircle } from "react-icons/hi2";

function updatePairs(
  pairs: KeyValuePair[],
  id: string,
  patch: Partial<KeyValuePair>,
): KeyValuePair[] {
  return pairs.map((pair) => (pair.id === id ? { ...pair, ...patch } : pair));
}

interface PairEditorProps {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
  addLabel: string;
  envValues: ReadonlyMap<string, string>;
  label: string;
  onFixVariable: (key: string) => void;
}

function isPairFilled(pair: KeyValuePair): boolean {
  return pair.key.trim() !== "" && pair.value.trim() !== "";
}

export function PairEditor({
  pairs,
  onChange,
  addLabel,
  envValues,
  label,
  onFixVariable,
}: PairEditorProps) {
  const lastPair = pairs.at(-1);
  const canAdd = pairs.length === 0 || (lastPair != null && isPairFilled(lastPair));

  const addPair = () => {
    if (!canAdd) return;
    onChange([
      ...pairs,
      { id: crypto.randomUUID(), key: "", value: "", enabled: true },
    ]);
  };

  return (
    <div>
      {pairs.map((pair) => (
        <div key={pair.id}>
          <KeyValueRow
            enabled={pair.enabled}
            keyName={pair.key}
            value={pair.value}
            envValues={envValues}
            onEnabledChange={(enabled) => onChange(updatePairs(pairs, pair.id, { enabled }))}
            onKeyChange={(key) => onChange(updatePairs(pairs, pair.id, { key }))}
            onValueChange={(value) => onChange(updatePairs(pairs, pair.id, { value }))}
            onRemove={() => onChange(pairs.filter((row) => row.id !== pair.id))}
          />
          <div className="px-1 pb-1">
            <PlaceholderHints
              text={pair.value}
              envValues={envValues}
              onFixVariable={onFixVariable}
            />
          </div>
        </div>
      ))}
      {pairs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <p className="text-sm text-gray-500">No {label} added yet. Add one to get started.</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 gap-1.5 !text-accent"
            onClick={addPair}
          >
            {addLabel}
            <HiPlusCircle />
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 gap-1.5 !text-accent disabled:hover:!bg-transparent disabled:cursor-not-allowed"
          disabled={!canAdd}
          onClick={addPair}
        >
          {addLabel}
          <HiPlusCircle />
        </Button>
      )}
    </div>
  );
}
