import type { BodyFormat } from "../types/response.types";

export function detectBodyFormat(contentType: string | null): BodyFormat {
  const mediaType = mediaTypeOf(contentType);
  if (mediaType === "application/json" || mediaType.endsWith("+json")) return "json";
  if (mediaType === "text/html" || mediaType === "application/xhtml+xml") return "html";
  return "raw";
}

function mediaTypeOf(contentType: string | null): string {
  if (!contentType) return "";
  return contentType.split(";")[0]?.trim().toLowerCase() ?? "";
}
