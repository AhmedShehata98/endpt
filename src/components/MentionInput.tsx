import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  ENV_VAR_ROLE_DEFAULT_KEYS,
  SECRET_ENV_ROLES,
} from "@modules/environment";
import { cn } from "@/lib/cn";

export interface ActiveMention {
  /** Index of the opening `{{` in the full value. */
  start: number;
  /** Text typed after `{{` (may be empty). */
  query: string;
}

export interface PlaceholderHit {
  key: string;
  start: number;
  end: number;
}

const PLACEHOLDER_TOKEN = /\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/g;

const SECRET_KEYS = new Set(
  [...SECRET_ENV_ROLES].map((role) => ENV_VAR_ROLE_DEFAULT_KEYS[role]),
);

/** Detect an open `{{query` mention ending at the cursor (not yet closed with `}}`). */
export function findActiveMention(text: string, cursor: number): ActiveMention | null {
  const before = text.slice(0, cursor);
  const match = /\{\{([A-Za-z0-9_]*)$/.exec(before);
  if (!match || match.index === undefined) return null;
  return { start: match.index, query: match[1] ?? "" };
}

export function insertMention(
  text: string,
  mention: ActiveMention,
  cursor: number,
  key: string,
): { value: string; cursor: number } {
  const token = `{{${key}}}`;
  const value = text.slice(0, mention.start) + token + text.slice(cursor);
  return { value, cursor: mention.start + token.length };
}

/** Find a completed `{{key}}` token that contains the character index. */
export function findPlaceholderAt(text: string, index: number): PlaceholderHit | null {
  for (const match of text.matchAll(PLACEHOLDER_TOKEN)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (index >= start && index < end) {
      return { key: match[1]!, start, end };
    }
  }
  return null;
}

export function formatMentionPopoverValue(
  key: string,
  envValues: ReadonlyMap<string, string>,
): string {
  if (!envValues.has(key)) return "Not defined";
  if (SECRET_KEYS.has(key)) return "••••••••";
  const envValue = envValues.get(key) ?? "";
  return envValue === "" ? "(empty)" : envValue;
}

export function splitMentionSegments(
  text: string,
): Array<{ type: "text" | "mention"; value: string; key?: string; start: number; end: number }> {
  const segments: Array<{
    type: "text" | "mention";
    value: string;
    key?: string;
    start: number;
    end: number;
  }> = [];
  let last = 0;
  for (const match of text.matchAll(PLACEHOLDER_TOKEN)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (start > last) {
      segments.push({ type: "text", value: text.slice(last, start), start: last, end: start });
    }
    segments.push({
      type: "mention",
      value: match[0],
      key: match[1]!,
      start,
      end,
    });
    last = end;
  }
  if (last < text.length) {
    segments.push({ type: "text", value: text.slice(last), start: last, end: text.length });
  }
  return segments;
}

interface HoverPopover {
  key: string;
  label: string;
  left: number;
  top: number;
}

interface MentionInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "size"> {
  value: string;
  onChange: (value: string) => void;
  /** Available environment variables: key → value. */
  envValues: ReadonlyMap<string, string>;
  mono?: boolean;
  invalid?: boolean;
}

export function MentionInput({
  value,
  onChange,
  envValues,
  mono,
  invalid,
  className,
  onBlur,
  onKeyDown,
  ...props
}: MentionInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [cursor, setCursor] = useState(0);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hover, setHover] = useState<HoverPopover | null>(null);
  const [scrollLeft, setScrollLeft] = useState(0);

  const mention = useMemo(() => findActiveMention(value, cursor), [value, cursor]);
  const segments = useMemo(() => splitMentionSegments(value), [value]);
  const hasMentions = segments.some((segment) => segment.type === "mention");

  const options = useMemo(() => {
    if (!mention) return [];
    const query = mention.query.toLowerCase();
    return [...envValues.entries()]
      .filter(([key]) => key.toLowerCase().startsWith(query))
      .map(([key, envValue]) => ({ key, envValue }));
  }, [envValues, mention]);

  useEffect(() => {
    setOpen(mention != null && options.length > 0);
    setActiveIndex(0);
  }, [mention, options.length]);

  const syncCursor = () => {
    const el = inputRef.current;
    if (el) setCursor(el.selectionStart ?? 0);
  };

  const focusAt = (index: number) => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(index, index);
    setCursor(index);
  };

  const applyOption = (key: string) => {
    if (!mention) return;
    const next = insertMention(value, mention, cursor, key);
    onChange(next.value);
    setOpen(false);
    setHover(null);
    requestAnimationFrame(() => focusAt(next.cursor));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (open && options.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % options.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + options.length) % options.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const option = options[activeIndex];
        if (option) applyOption(option.key);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
    }
    onKeyDown?.(e);
  };

  const showMentionHover = (
    key: string,
    target: HTMLElement,
  ) => {
    if (open) return;
    const rect = target.getBoundingClientRect();
    setHover({
      key,
      label: formatMentionPopoverValue(key, envValues),
      left: rect.left,
      top: rect.bottom + 6,
    });
  };

  const overlay: ReactNode = hasMentions ? (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 z-[2] overflow-hidden rounded-md",
        "flex items-center px-2.5",
        mono ? "font-mono text-[0.8125rem]" : "text-sm",
      )}
    >
      <div
        className="whitespace-pre text-text-primary"
        style={{ transform: `translateX(-${scrollLeft}px)` }}
      >
        {segments.map((segment) =>
          segment.type === "mention" ? (
            <span
              key={`${segment.start}-${segment.key}`}
              className={cn(
                "pointer-events-auto cursor-default rounded-[2px]",
                envValues.has(segment.key!)
                  ? "bg-success-subtle text-success"
                  : "bg-error-subtle text-error",
              )}
              onMouseEnter={(e) => showMentionHover(segment.key!, e.currentTarget)}
              onMouseLeave={() => setHover(null)}
              onMouseDown={(e) => {
                e.preventDefault();
                focusAt(segment.end);
              }}
            >
              {segment.value}
            </span>
          ) : (
            <span key={segment.start}>{segment.value}</span>
          ),
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className="relative min-w-0">
      {overlay}
      <input
        ref={inputRef}
        className={cn(
          "relative z-[1] h-8 w-full rounded-md border bg-bg-surface px-2.5 text-sm text-text-primary placeholder:text-text-subtle",
          "border-border-default hover:border-border-strong focus:border-accent",
          "caret-text-primary",
          hasMentions && "bg-transparent text-transparent selection:bg-accent/30",
          mono && "font-mono text-[0.8125rem]",
          invalid && "border-error",
          className,
        )}
        value={value}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={
          open && options[activeIndex] ? `${listId}-${options[activeIndex]!.key}` : undefined
        }
        onChange={(e) => {
          onChange(e.target.value);
          setCursor(e.target.selectionStart ?? e.target.value.length);
          setHover(null);
        }}
        onClick={syncCursor}
        onKeyUp={syncCursor}
        onSelect={syncCursor}
        onKeyDown={handleKeyDown}
        onScroll={(e) => {
          setScrollLeft(e.currentTarget.scrollLeft);
          setHover(null);
        }}
        onBlur={(e) => {
          setOpen(false);
          setHover(null);
          onBlur?.(e);
        }}
        {...props}
      />
      {hover && !open && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-50 max-w-xs rounded-md border border-border-default bg-bg-surface px-2 py-1.5 shadow-md"
          style={{ left: hover.left, top: hover.top }}
        >
          <div className="font-mono text-[0.75rem] text-text-muted">{`{{${hover.key}}}`}</div>
          <div className="truncate text-[0.8125rem] text-text-primary">{hover.label}</div>
        </div>
      )}
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border-default bg-bg-surface py-1 shadow-md"
        >
          {options.map((option, index) => (
            <li
              key={option.key}
              id={`${listId}-${option.key}`}
              role="option"
              aria-selected={index === activeIndex}
              className={cn(
                "cursor-pointer px-2.5 py-1.5",
                index === activeIndex ? "bg-bg-active" : "hover:bg-bg-subtle",
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                applyOption(option.key);
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <div className="font-mono text-[0.8125rem] text-text-primary">{`{{${option.key}}}`}</div>
              <div className="truncate text-[0.75rem] text-text-muted">
                {formatMentionPopoverValue(option.key, envValues)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
