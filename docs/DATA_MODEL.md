# Data Model — Endpt

Local-first data model derived from [PRD.md](./PRD.md). Prefer a flat, minimal schema: Project → Collection → Request is optional; ad-hoc requests and env vars work without it.

## 1. Entity overview

```
UserAccount 1──1 Session (when signed in)
     │
     ├── 1──1 UserSettings
     ├── 1──* EnvironmentVariable
     ├── 1──* Project 1──* Collection 1──* SavedRequest
     └── 0──1 AdHocRequest
```

| Path | Entities | PRD |
|------|----------|-----|
| Ad-hoc | `AdHocRequest` only | FR-01, AC-01, AC-02 |
| Organized | `Project` → `Collection` → `SavedRequest` | FR-19–FR-21 |
| Shared config | `EnvironmentVariable`, `UserSettings` | FR-11–FR-14, FR-17 |

---

## 2. Core entities

### 2.1 UserAccount

Local-first identity. Cloud link is optional (FR-15, FR-16, FR-17). Core workflows also work with a local-only account (assumptions: no account/network required for ad-hoc use).

| Field | Type | Notes |
|-------|------|--------|
| `id` | UUID | Local primary key |
| `email` | string | Sign-up / sign-in identifier (stored lowercase) |
| `displayName` | string \| null | Personal info |
| `passwordHash` | string | Argon2id PHC string; **local-only, never sync** |
| `cloudUserId` | string \| null | Set after cloud link; null = local-only |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |
| `lastSyncedAt` | datetime \| null | Last successful cloud sync |
| `deletedAt` | datetime \| null | Sync tombstone |

Credentials for sign-in are never stored as plaintext. Local password auth stores a one-way Argon2 hash only (`passwordHash`); never sync the hash or plaintext — NFR-02.

### 2.2 Session

Authenticated session after sign-up / sign-in (AC-13). Local-only; do not sync.

| Field | Type | Notes |
|-------|------|--------|
| `id` | UUID | |
| `userId` | UUID | FK → UserAccount |
| `accessToken` | string \| null | Cloud session token if linked |
| `createdAt` | datetime | |
| `expiresAt` | datetime \| null | |

### 2.3 UserSettings

Stored with the account; applied on next launch (FR-17, AC-14).

| Field | Type | Notes |
|-------|------|--------|
| `id` | UUID | |
| `userId` | UUID | FK → UserAccount (1:1) |
| `theme` | `system` \| `light` \| `dark` | Preference |
| `defaultHttpMethod` | HttpMethod | Request builder default |
| `wrapResponseLines` | boolean | Response viewer preference |
| `syncEnabled` | boolean | Opt-in cloud sync |
| `updatedAt` | datetime | |
| `deletedAt` | datetime \| null | Sync tombstone |

### 2.4 Project

One or more per account (FR-19, AC-17).

| Field | Type | Notes |
|-------|------|--------|
| `id` | UUID | |
| `userId` | UUID | FK → UserAccount |
| `name` | string | Required |
| `description` | string \| null | |
| `sortOrder` | integer | UI order |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |
| `deletedAt` | datetime \| null | Sync tombstone |

### 2.5 Collection

One or more per project (FR-20, AC-18).

| Field | Type | Notes |
|-------|------|--------|
| `id` | UUID | |
| `projectId` | UUID | FK → Project |
| `name` | string | Required |
| `description` | string \| null | |
| `sortOrder` | integer | |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |
| `deletedAt` | datetime \| null | Sync tombstone |

### 2.6 RequestDraft (embedded shape)

Shared shape for ad-hoc and saved requests (FR-02–FR-07). Not a standalone table.

| Field | Type | Notes |
|-------|------|--------|
| `name` | string \| null | Optional for ad-hoc; required when saving |
| `method` | HttpMethod | `GET` \| `POST` \| `PUT` \| `PATCH` \| `DELETE` |
| `url` | string | May use `{{baseUrl}}` / other `{{key}}` placeholders |
| `queryParams` | KeyValuePair[] | FR-05, AC-05 |
| `headers` | KeyValuePair[] | FR-06, AC-06 |
| `bodyType` | BodyType | FR-04 |
| `body` | string \| null | FR-03; omit when method/bodyType has no body |
| `auth` | AuthConfig | FR-07, AC-07 |

#### KeyValuePair

| Field | Type | Notes |
|-------|------|--------|
| `id` | UUID | Stable row id |
| `key` | string | |
| `value` | string | May contain `{{envKey}}` |
| `enabled` | boolean | Disabled rows are not sent |

#### AuthConfig

Limited to token, API key, username/password (PRD constraints).

| Field | Type | Notes |
|-------|------|--------|
| `enabled` | boolean | When false, auth is not applied (AC-07) |
| `type` | AuthType | Ignored when `enabled` is false |
| `token` | string \| null | Bearer/token; may be `{{authToken}}` |
| `apiKey` | string \| null | May be `{{apiKey}}` |
| `apiKeyHeader` | string \| null | Header name for API key (e.g. `X-API-Key`) |
| `username` | string \| null | May be `{{username}}` |
| `password` | string \| null | May be `{{password}}` |

### 2.7 AdHocRequest

Current unsaved builder state. No project or collection (FR-01, AC-01, AC-02).

| Field | Type | Notes |
|-------|------|--------|
| `id` | UUID | One active draft per user is enough |
| `userId` | UUID \| null | Null for guest / pre-account local use |
| `draft` | RequestDraft | Full state for edit / resend |
| `updatedAt` | datetime | |

Local-only (not cloud-synced). Saving into a collection copies `draft` into a `SavedRequest`.

### 2.8 SavedRequest

Request under a collection (FR-21, AC-19).

| Field | Type | Notes |
|-------|------|--------|
| `id` | UUID | |
| `collectionId` | UUID | FK → Collection |
| `draft` | RequestDraft | Same shape as ad-hoc |
| `sortOrder` | integer | |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |
| `deletedAt` | datetime \| null | Sync tombstone |

### 2.9 EnvironmentVariable

PRD scopes suggested roles to auth token, API key, username/password, and base URL (FR-11–FR-14, AC-11, AC-12), and also allows freeform custom keys (FR-14a, AC-11a). Flat per user — no separate “Environment” entity for MVP (KISS).

| Field | Type | Notes |
|-------|------|--------|
| `id` | UUID | |
| `userId` | UUID | FK → UserAccount |
| `key` | string | Unique per user among non-deleted rows; must match `^[A-Za-z_][A-Za-z0-9_]*$` |
| `value` | string | Encrypt at rest (NFR-02); secret roles are masked in UI |
| `role` | EnvVarRole | Semantic role for UI / defaults / masking |
| `updatedAt` | datetime | |
| `deletedAt` | datetime \| null | Sync tombstone |

**`EnvVarRole`:** `authToken` \| `apiKey` \| `username` \| `password` \| `baseUrl` \| `custom`

**Fixed roles** (`authToken`, `apiKey`, `username`, `password`, `baseUrl`) propose default keys. **`custom`** requires a user-chosen key. Secret masking applies to the four auth fixed roles only; `baseUrl` and `custom` are unmasked by default.

### 2.10 ResponseView (runtime / UI state)

Not a persisted domain entity. Holds the last response for the viewer (FR-08–FR-10, AC-08–AC-10). Keep in memory (or short-lived local cache); do not sync.

| Field | Type | Notes |
|-------|------|--------|
| `status` | integer \| null | Null on transport error |
| `statusText` | string \| null | |
| `headers` | { key, value }[] | |
| `body` | string | Full payload (copy uses this — FR-09) |
| `contentType` | string \| null | Drive JSON / HTML prettify (FR-08) |
| `bodyFormat` | `json` \| `html` \| `raw` | Derived for highlighting |
| `durationMs` | integer \| null | |
| `errorMessage` | string \| null | Clear error when send fails |
| `receivedAt` | datetime | |

`size` (if shown in UI) is derived from `body` length/bytes at render time and is not stored.

Fullscreen (FR-10) is UI state over this object, not a separate record.

---

## 3. Enums

| Name | Values | PRD |
|------|--------|-----|
| `HttpMethod` | `GET`, `POST`, `PUT`, `PATCH`, `DELETE` | FR-02 |
| `BodyType` | `none`, `json`, `raw` | FR-04 (MVP; keep small) |
| `AuthType` | `bearerToken`, `apiKey`, `basic` | Constraints; use with `AuthConfig.enabled` |
| `EnvVarRole` | `authToken`, `apiKey`, `username`, `password`, `baseUrl`, `custom` | FR-11–FR-14, FR-14a |

---

## 4. Relationships & invariants

| Rule | Detail |
|------|--------|
| Ownership | Projects belong to a user; collections to a project; saved requests to a collection |
| Optional hierarchy | Ad-hoc requests never require `projectId` / `collectionId` |
| Cascade delete | Delete project → collections → saved requests; delete user vars with user (or soft-delete) |
| Unique env keys | (`userId`, `key`) unique among non-deleted rows |
| Valid env keys | Key required; pattern `^[A-Za-z_][A-Za-z0-9_]*$` (`isValidEnvKey`) |
| Placeholder resolution | Before send, replace `{{key}}` in URL, params, headers, body, and auth fields from the user’s env vars (AC-12) |
| Auth | Applied only when `auth.enabled`; maps to Bearer / API-key header / Basic |
| Body | Sent only when method supports a body and `bodyType ≠ none` (AC-04) |
| Save path | Ad-hoc → pick collection → create `SavedRequest` from `draft` (AC-19) |
| Guest use | Ad-hoc + local env vars allowed with `userId = null` or a local-only account; projects require a user (AC-17) |

---

## 5. Local-first & sync

FR-16, FR-18, AC-15, AC-16, NFR-02, NFR-03.

| Concern | Approach |
|---------|----------|
| Source of truth | Local disk (SQLite) while offline |
| Remote | Firebase Auth + Cloud Firestore ([ADR-006](./adr/ADR-006-firebase-sync.md)) |
| Paths | `users/{cloudUserId}/settings\|projects\|collections\|savedRequests\|environmentVariables/{id}` |
| Cloud link | Same email+password as local account on first sync; sets `cloudUserId` |
| Syncable | UserSettings, Project, Collection, SavedRequest, EnvironmentVariable |
| Local-only | Session, AdHocRequest, ResponseView, `UserAccount.passwordHash` |
| Secrets | Encrypt env values and auth fields at rest; TLS in transit; client-encrypt secrets before upload |
| Conflicts | Last-write-wins per entity via `updatedAt` (**personal** sync only; teams: [ADR-009](./adr/ADR-009-team-collaboration-firebase.md)) |
| Deletes | Soft-delete via `deletedAt`, then purge after sync |
| Unsigned / offline | Full build-send-save-local and env management without network |

---

## 6. Out of scope (do not model)

Per PRD §2 / §6:

- Scheduled, CI, or automated test runs
- Load / stress jobs
- Mock servers
- GraphQL / WebSocket / gRPC
- OpenAPI docs or SDK generation
- Real-time multi-user editing
- Multiple named environments for **personal** data (Postman-style) — personal env stays flat per user
- Personal request history / response archives (team execution history is modeled in feature docs)
- Mobile-specific profiles

### Team entities (pointer)

Team, membership, invitation, team-project, audit, and related shapes are defined in [`features/team-collaboration/TEAM_DATA_MODEL.md`](./features/team-collaboration/TEAM_DATA_MODEL.md) and stored in Firestore per [ADR-009](./adr/ADR-009-team-collaboration-firebase.md). Do not duplicate those tables here.

Personal `Project` remains `userId`-owned. Team projects live under `teams/{teamId}/projects/{projectId}` and are not part of personal LWW sync.

---

## 7. PRD coverage

| Requirement | Model support |
|-------------|---------------|
| FR-01 / AC-01–02 | `AdHocRequest` |
| FR-02–07 / AC-03–07 | `RequestDraft` + `AuthConfig` |
| FR-08–10 / AC-08–10 | `ResponseView` (runtime) |
| FR-11–14, FR-14a / AC-11–12, AC-11a | `EnvironmentVariable` + `EnvVarRole` (incl. `custom`) |
| FR-15 / AC-13 | `UserAccount` + `Session` |
| FR-16–18 / AC-15–16 | Local-first + sync rules |
| FR-17 / AC-14 | `UserSettings` |
| FR-19–21 / AC-17–19 | `Project`, `Collection`, `SavedRequest` |
| NFR-02 | Encrypted secrets; no plaintext credential sync |

---

## 8. Module mapping

| Module | Owns |
|--------|------|
| `modules/account` | UserAccount, Session, UserSettings |
| `modules/project` | Project, Collection |
| `modules/request` | RequestDraft, AdHocRequest, SavedRequest, send pipeline |
| `modules/environment` | EnvironmentVariable, `{{key}}` resolution |
| `modules/response` | ResponseView, prettify / copy / fullscreen |
| `modules/sync` | Cloud sync, tombstones, LWW (personal) |
| `modules/team` | Team policy, TeamRemote, team UI orchestration |
