import { findPlaceholders } from "@modules/environment";
import { Button } from "@/components";

interface PlaceholderHintsProps {
  text: string;
  definedKeys: ReadonlySet<string>;
  onFixVariable: () => void;
}

export function PlaceholderHints({
  text,
  definedKeys,
  onFixVariable,
}: PlaceholderHintsProps) {
  const keys = findPlaceholders(text);
  if (keys.length === 0) return null;

  return (
    <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[0.75rem]">
      {keys.map((key) => {
        const defined = definedKeys.has(key);
        return (
          <li key={key} className="flex items-center gap-1.5">
            <code
              className={
                defined
                  ? "rounded bg-success-subtle px-1 font-mono text-success"
                  : "rounded bg-error-subtle px-1 font-mono text-error"
              }
            >
              {`{{${key}}}`}
            </code>
            {defined ? (
              <span className="text-text-muted">Resolved</span>
            ) : (
              <>
                <span className="text-error">Not defined</span>
                <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={onFixVariable}>
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
