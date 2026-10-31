import { useEffect, useRef, useState } from "react";
import { EditorState, type Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import type { BodyFormat } from "@modules/response";
import { cn } from "@/lib/cn";
import {
  responseEditorTheme,
  responseHighlighting,
} from "@/views/response/response-editor-theme";

interface ResponseBodyViewProps {
  body: string;
  bodyFormat: BodyFormat;
  wrapLines: boolean;
  rendering?: boolean;
  className?: string;
}

interface LoadedLanguage {
  format: BodyFormat;
  extension: Extension;
}

const EMPTY_BODY_MESSAGE = "This response has no body.";

export function ResponseBodyView({
  body,
  bodyFormat,
  wrapLines,
  rendering = false,
  className,
}: ResponseBodyViewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [loadedLanguage, setLoadedLanguage] = useState<LoadedLanguage | null>(null);

  useEffect(() => {
    if (bodyFormat === "raw") return;

    let cancelled = false;
    void (async () => {
      const extension =
        bodyFormat === "json"
          ? (await import("@codemirror/lang-json")).json()
          : (await import("@codemirror/lang-html")).html();
      if (!cancelled) setLoadedLanguage({ format: bodyFormat, extension });
    })();

    return () => {
      cancelled = true;
    };
  }, [bodyFormat]);

  const langExtension =
    bodyFormat !== "raw" && loadedLanguage?.format === bodyFormat
      ? loadedLanguage.extension
      : null;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || rendering || !body) return;

    const extensions: Extension[] = [
      EditorView.editable.of(false),
      EditorState.readOnly.of(true),
      responseEditorTheme,
      responseHighlighting,
      EditorView.contentAttributes.of({ "aria-label": "Response body" }),
    ];
    if (wrapLines) extensions.push(EditorView.lineWrapping);
    if (langExtension) extensions.push(langExtension);

    const state = EditorState.create({ doc: body, extensions });
    const view = new EditorView({ state, parent: host });

    return () => {
      view.destroy();
    };
  }, [body, bodyFormat, wrapLines, langExtension, rendering]);

  if (rendering) {
    return (
      <div
        className={cn(
          "flex min-h-0 flex-1 items-center justify-center p-3 text-[0.8125rem] text-text-muted",
          className,
        )}
      >
        Rendering large response…
      </div>
    );
  }

  if (!body) {
    return (
      <div
        className={cn(
          "min-h-0 flex-1 p-3 font-mono text-[0.8125rem] leading-5 text-text-muted",
          className,
        )}
      >
        {EMPTY_BODY_MESSAGE}
      </div>
    );
  }

  return (
    <div
      ref={hostRef}
      className={cn("response-body-editor min-h-0 flex-1 overflow-hidden", className)}
    />
  );
}
