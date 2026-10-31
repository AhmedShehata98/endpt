export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type BodyType = "none" | "json" | "raw";

export type AuthType = "bearerToken" | "apiKey" | "basic";

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface AuthConfig {
  enabled: boolean;
  type: AuthType;
  token: string | null;
  apiKey: string | null;
  apiKeyHeader: string | null;
  username: string | null;
  password: string | null;
}

export interface RequestDraft {
  name: string | null;
  method: HttpMethod;
  url: string;
  queryParams: KeyValuePair[];
  headers: KeyValuePair[];
  bodyType: BodyType;
  body: string | null;
  auth: AuthConfig;
}

export interface AdHocRequest {
  id: string;
  userId: string | null;
  draft: RequestDraft;
  updatedAt: string;
}

export interface SavedRequest {
  id: string;
  collectionId: string;
  draft: RequestDraft;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export function createEmptyAuthConfig(): AuthConfig {
  return {
    enabled: false,
    type: "bearerToken",
    token: null,
    apiKey: null,
    apiKeyHeader: "X-API-Key",
    username: null,
    password: null,
  };
}

export function createEmptyDraft(method: HttpMethod = "GET"): RequestDraft {
  return {
    name: null,
    method,
    url: "",
    queryParams: [],
    headers: [],
    bodyType: "none",
    body: null,
    auth: createEmptyAuthConfig(),
  };
}
