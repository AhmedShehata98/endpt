import { startTransition, useEffect, useState } from "react";
import { prettifyBody, type BodyFormat } from "@modules/response";

const LARGE_BODY_CHARS = 50_000;

export interface FormattedBody {
  text: string;
  format: BodyFormat;
  rendering: boolean;
}

interface AsyncFormat {
  body: string;
  bodyFormat: BodyFormat;
  text: string;
  format: BodyFormat;
}

export function useFormattedBody(body: string, bodyFormat: BodyFormat): FormattedBody {
  const isLarge = body.length >= LARGE_BODY_CHARS;
  const [asyncState, setAsyncState] = useState<AsyncFormat | null>(null);

  useEffect(() => {
    if (!isLarge) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      const pretty = prettifyBody(body, bodyFormat);
      startTransition(() => {
        if (!cancelled) {
          setAsyncState({
            body,
            bodyFormat,
            text: pretty.text,
            format: pretty.format,
          });
        }
      });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [body, bodyFormat, isLarge]);

  if (!isLarge) {
    const pretty = prettifyBody(body, bodyFormat);
    return { text: pretty.text, format: pretty.format, rendering: false };
  }

  if (asyncState && asyncState.body === body && asyncState.bodyFormat === bodyFormat) {
    return {
      text: asyncState.text,
      format: asyncState.format,
      rendering: false,
    };
  }

  return { text: body, format: bodyFormat, rendering: true };
}
