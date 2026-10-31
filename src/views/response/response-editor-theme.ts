import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

export const responseEditorTheme = EditorView.theme(
  {
    "&": {
      height: "100%",
      fontSize: "0.8125rem",
      backgroundColor: "transparent",
      color: "var(--text-primary)",
    },
    ".cm-scroller": {
      fontFamily: "var(--font-mono), ui-monospace, monospace",
      lineHeight: "1.25rem",
      overflow: "auto",
    },
    ".cm-content": {
      caretColor: "var(--accent)",
      padding: "0.75rem 0",
    },
    ".cm-gutters": {
      backgroundColor: "transparent",
      color: "var(--text-subtle)",
      border: "none",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "transparent",
    },
    ".cm-activeLine": {
      backgroundColor: "transparent",
    },
    "&.cm-focused .cm-cursor": {
      borderLeftColor: "var(--accent)",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "var(--accent-subtle) !important",
    },
  },
  { dark: false },
);

const highlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: "var(--accent)" },
  { tag: t.bool, color: "var(--accent)" },
  { tag: t.null, color: "var(--accent)" },
  { tag: t.number, color: "var(--info)" },
  { tag: t.string, color: "var(--success)" },
  { tag: t.propertyName, color: "var(--text-primary)" },
  { tag: t.tagName, color: "var(--accent)" },
  { tag: t.attributeName, color: "var(--info)" },
  { tag: t.attributeValue, color: "var(--success)" },
  { tag: t.comment, color: "var(--text-muted)", fontStyle: "italic" },
  { tag: t.punctuation, color: "var(--text-secondary)" },
  { tag: t.bracket, color: "var(--text-secondary)" },
  { tag: t.meta, color: "var(--text-muted)" },
]);

export const responseHighlighting = syntaxHighlighting(highlightStyle);
