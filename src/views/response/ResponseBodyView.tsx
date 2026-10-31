import { cn } from "@/lib/cn";

interface ResponseBodyViewProps {
  body: string;
  wrapLines: boolean;
  className?: string;
}

export function ResponseBodyView({ body, wrapLines, className }: ResponseBodyViewProps) {
  return (
    <pre
      className={cn(
        "min-h-0 flex-1 overflow-auto p-3 font-mono text-[0.8125rem] leading-5 text-text-primary",
        wrapLines ? "whitespace-pre-wrap break-words" : "whitespace-pre",
        className,
      )}
    >
      {body || "This response has no body."}
    </pre>
  );
}
