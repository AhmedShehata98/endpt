export type BodyFormat = "json" | "html" | "raw";

export interface ResponseHeader {
  key: string;
  value: string;
}

export interface ResponseView {
  status: number | null;
  statusText: string | null;
  headers: ResponseHeader[];
  body: string;
  contentType: string | null;
  bodyFormat: BodyFormat;
  durationMs: number | null;
  errorMessage: string | null;
  receivedAt: string;
}

export function responseSizeBytes(view: ResponseView): number {
  return new TextEncoder().encode(view.body).length;
}
