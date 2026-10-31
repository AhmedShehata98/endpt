import type { BodyFormat } from "../types/response.types";

export interface PrettifyResult {
  text: string;
  format: BodyFormat;
}

const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

export function prettifyBody(body: string, format: BodyFormat): PrettifyResult {
  if (!body) return { text: body, format };

  if (format === "json") {
    try {
      return { text: JSON.stringify(JSON.parse(body), null, 2), format: "json" };
    } catch {
      return { text: body, format: "raw" };
    }
  }

  if (format === "html") {
    try {
      return { text: prettifyHtml(body), format: "html" };
    } catch {
      return { text: body, format: "raw" };
    }
  }

  return { text: body, format: "raw" };
}

function prettifyHtml(source: string): string {
  const parts = source
    .replace(/\r\n?/g, "\n")
    .split(/(<[^>]+>)/g)
    .filter((part) => part.length > 0);

  let depth = 0;
  const lines: string[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("</")) {
      depth = Math.max(0, depth - 1);
      lines.push(`${"  ".repeat(depth)}${trimmed}`);
      continue;
    }

    if (trimmed.startsWith("<!") || trimmed.startsWith("<?")) {
      lines.push(`${"  ".repeat(depth)}${trimmed}`);
      continue;
    }

    if (trimmed.startsWith("<")) {
      const tagMatch = /^<\/?([a-zA-Z][\w:-]*)/.exec(trimmed);
      const name = tagMatch?.[1]?.toLowerCase() ?? "";
      const selfClosing = trimmed.endsWith("/>") || VOID_TAGS.has(name);
      lines.push(`${"  ".repeat(depth)}${trimmed}`);
      if (!selfClosing) depth += 1;
      continue;
    }

    lines.push(`${"  ".repeat(depth)}${trimmed}`);
  }

  return lines.join("\n");
}
