import { findPlaceholders } from "@modules/environment";
import { Button } from "@/components";

interface PlaceholderHintsProps {
  text: string;
  /** Map of defined env keys to their values (empty string means defined-but-empty). */
  envValues: ReadonlyMap<string, string>;
  onFixVariable: (key: string) => void;
}

export function PlaceholderHints({
  text,
  envValues,
  onFixVariable,
}: PlaceholderHintsProps) {
  const keys = findPlaceholders(text);
  if (keys.length === 0) return null;

  return (
    <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[0.75rem]">
      {keys.map((key) => {
        const defined = envValues.has(key);
        const empty = defined && envValues.get(key) === "";

        return (
          <li key={key} className="flex items-center gap-1.5">
            <code
              className={
                defined && !empty
                  ? "rounded bg-success-subtle px-1 font-mono text-success"
                  : empty
                    ? "rounded bg-bg-active px-1 font-mono text-text-muted"
                    : "rounded bg-error-subtle px-1 font-mono text-error"
              }
            >
              {`{{${key}}}`}
            </code>
            {defined && !empty ? (
              <span className="text-text-muted">Resolved</span>
            ) : empty ? (
              <span className="text-text-muted">Empty</span>
            ) : (
              <>
                <span className="text-error">Not defined</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5"
                  onClick={() => onFixVariable(key)}
                >
                  Fix variable
                </Button>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
