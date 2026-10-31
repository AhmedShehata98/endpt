export type { BodyFormat, ResponseHeader, ResponseView } from "./types/response.types";
export { responseSizeBytes } from "./types/response.types";

export { detectBodyFormat } from "./application/detect-body-format";
export { formatResponseBytes } from "./application/format-response-bytes";
export { prettifyBody } from "./application/prettify-body";
export type { PrettifyResult } from "./application/prettify-body";
