import type { EnvironmentVariable } from "@modules/environment";
import type { KeyValuePair, RequestDraft } from "@modules/request";
import { createEmptyAuthConfig } from "@modules/request";
import type { ResponseView } from "@modules/response";

function kv(id: string, key: string, value: string, enabled = true): KeyValuePair {
  return { id, key, value, enabled };
}

export const MOCK_DRAFT: RequestDraft = {
  name: "Retrieve authenticated user",
  method: "GET",
  url: "{{baseUrl}}/v1/users/me",
  queryParams: [
    kv("p1", "expand", "teams,permissions"),
    kv("p2", "filter_status", "active", false),
  ],
  headers: [
    kv("h1", "Accept", "application/json"),
    kv("h2", "X-Request-Id", "req_demo"),
  ],
  bodyType: "none",
  body: null,
  auth: {
    ...createEmptyAuthConfig(),
    enabled: true,
    type: "bearerToken",
    token: "{{authToken}}",
  },
};

export const MOCK_RESPONSE: ResponseView = {
  status: 200,
  statusText: "OK",
  headers: [
    { key: "content-type", value: "application/json" },
    { key: "x-request-id", value: "req_demo" },
  ],
  body: `{
  "id": "usr_9928a471e",
  "object": "user",
  "email": "alex@example.com",
  "name": "Alex Chen",
  "role": "developer"
}`,
  contentType: "application/json",
  bodyFormat: "json",
  durationMs: 42,
  errorMessage: null,
  receivedAt: new Date().toISOString(),
};

export const MOCK_ENV_VARS: EnvironmentVariable[] = [
  {
    id: "e1",
    userId: null,
    key: "baseUrl",
    value: "https://api.example.com",
    role: "baseUrl",
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  },
  {
    id: "e2",
    userId: null,
    key: "authToken",
    value: "tok_live_••••3a9f",
    role: "authToken",
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  },
  {
    id: "e3",
    userId: null,
    key: "apiKey",
    value: "key_••••",
    role: "apiKey",
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  },
  {
    id: "e4",
    userId: null,
    key: "username",
    value: "demo",
    role: "username",
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  },
  {
    id: "e5",
    userId: null,
    key: "password",
    value: "••••••••",
    role: "password",
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  },
];

export const MOCK_COLLECTION_TREE = [
  {
    id: "proj-1",
    name: "Auth Service",
    collections: [
      {
        id: "col-1",
        name: "Users",
        requests: [
          { id: "req-1", name: "Get me", method: "GET" as const },
          { id: "req-2", name: "Create user", method: "POST" as const },
        ],
      },
      {
        id: "col-2",
        name: "Tokens",
        requests: [{ id: "req-3", name: "OAuth token", method: "POST" as const }],
      },
    ],
  },
  {
    id: "proj-2",
    name: "Billing",
    collections: [
      {
        id: "col-3",
        name: "Invoices",
        requests: [{ id: "req-4", name: "List invoices", method: "GET" as const }],
      },
    ],
  },
];
