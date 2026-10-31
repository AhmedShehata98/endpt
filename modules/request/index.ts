export type {
  HttpMethod,
  BodyType,
  AuthType,
  KeyValuePair,
  AuthConfig,
  RequestDraft,
  AdHocRequest,
  SavedRequest,
} from "./types/http.types";

export { HTTP_METHODS, createEmptyAuthConfig, createEmptyDraft } from "./types/http.types";

export type { AdHocRequestRepository } from "./ports/ad-hoc-request.repository";
export type { SavedRequestRepository } from "./ports/saved-request.repository";

export type { PreparedRequest, TransportResult, HttpClient } from "./ports/http-client.interface";
export { DEFAULT_HTTP_TIMEOUT_MS } from "./ports/http-client.interface";

export type { ValidationIssue } from "./application/validate-draft";
export { validateDraft } from "./application/validate-draft";
export { prepareRequest, requestSendsBody } from "./application/prepare-request";
export type { SendResult } from "./application/request.service";
export { RequestService } from "./application/request.service";

export { FetchHttpClient } from "./infrastructure/network/fetch-http-client";
export { TauriHttpClient } from "./infrastructure/network/tauri-http-client";
