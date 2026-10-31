import { Button, KeyValueRow } from "@/components";
import type { KeyValuePair } from "@modules/request";

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
}

export function PairEditor({ pairs, onChange, addLabel }: PairEditorProps) {
  return (
    <div>
      {pairs.map((pair) => (
        <KeyValueRow
          key={pair.id}
          enabled={pair.enabled}
          keyName={pair.key}
          value={pair.value}
          onEnabledChange={(enabled) => onChange(updatePairs(pairs, pair.id, { enabled }))}
          onKeyChange={(key) => onChange(updatePairs(pairs, pair.id, { key }))}
          onValueChange={(value) => onChange(updatePairs(pairs, pair.id, { value }))}
          onRemove={() => onChange(pairs.filter((row) => row.id !== pair.id))}
        />
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="mt-1"
        onClick={() =>
          onChange([
            ...pairs,
            { id: crypto.randomUUID(), key: "", value: "", enabled: true },
          ])
        }
      >
        {addLabel}
      </Button>
    </div>
  );
}
