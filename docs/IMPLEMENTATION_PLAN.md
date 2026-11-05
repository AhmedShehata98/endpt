# Implementation Plan — Endpt

**Status:** Active
**Version:** 1.2
**Last checked:** 2026-11-02
**Source of truth:** [PRD.md](./PRD.md)
**Supporting docs:** [ARCHITECTURE.md](./ARCHITECTURE.md), [DATA_MODEL.md](./DATA_MODEL.md), [UI_UX_SPEC.md](./UI_UX_SPEC.md) (v1.1)

> Rule: if any document conflicts with the PRD, the PRD wins. Do not build anything listed in section 7 (Out of Scope).

---

## 1. Overview

**Product:** Endpt, a lightweight desktop API client (Tauri 2 + React + TypeScript + Vite).

**Objective:** Ship an MVP that covers every in-scope PRD requirement:

- Ad-hoc HTTP requests (REST only)
- Response viewing (prettify, highlight, copy, fullscreen)
- Environment variables (five suggested roles + custom keys)
- Optional accounts, settings, and preferences
- Local-first storage with optional cloud sync
- Project → Collection → Request organization

**UI surface (UI/UX Spec v1.1):** 4 views (Workspace, Collections, Environment, Settings), 2 auth screens (Sign In, Sign Up), and overlays (Response fullscreen, Save Request dialog, Variables drawer, Add Variable dialog with custom keys, create/rename/delete dialogs).

**Navigation:** Screens are **TanStack Router** file routes under `src/routes/` (URL-backed). Shared shell state uses `ApplicationProvider` in `src/state-management/`. Legacy `useState<AppView>` / `setView` navigation in `App.tsx` is retired (TODO DELETED).

---

## 2. Implementation Principles

- **PRD first:** Prefer PRD + DATA_MODEL over UI_UX_SPEC and ARCHITECTURE where they conflict.
- **KISS:** No Domain Layer, no DI framework (ADR-003, ADR-004). Add folders only when a file needs them.
- **Layering:** Presentation → Application → Ports ← Infrastructure. Presentation never calls Fetch or any transport directly.
- **Router owns screens:** Navigate with TanStack Router (`navigate` / `Link`), not a hardcoded view enum in React state ([ADR-008](./ARCHITECTURE.md#adr-008-tanstack-router-instead-of-in-memory-view-state)).
- **Ad-hoc first:** Sending a request never requires a project, collection, account, or network setup (FR-01, AC-01).
- **Local-first:** Core flows work offline. Sync is optional and never blocks the UI (FR-16, FR-18, NFR-03).
- **Separate concerns:** HTTP execution and persistence stay separate. Sending does not write through the network client into storage.
- **Error categories stay distinct:** validation error, HTTP response (including 4xx/5xx), and network/transport failure.
- **Never assume JSON:** parse by content type; fall back to raw.
- **Secure secrets:** Encrypt env values and auth fields at rest; never log or export secrets (NFR-02).
- **Test the engine first:** Unit-test `RequestService`, resolver, and repositories before heavy UI.
- **TypeScript strict** everywhere.

---

## 3. Module Map and Project Structure

Aligned with DATA_MODEL §8 and ARCHITECTURE §12. Create only the folders you need.

| Module | Path | Owns | PRD |
|---|---|---|---|
| Request | `modules/request` | `RequestDraft`, `AdHocRequest`, `SavedRequest` types, `RequestService`, `HttpClient` port, HTTP adapters | FR-01–07, FR-21 |
| Response | `modules/response` | `ResponseView`, format detection, prettify, copy, fullscreen UI | FR-08–10 |
| Environment | `modules/environment` | `EnvironmentVariable`, `{{key}}` resolver, Variables UI | FR-11–14 |
| Account | `modules/account` | `UserAccount`, `Session`, `UserSettings`, auth and settings UI | FR-15, FR-17 |
| Project | `modules/project` | `Project`, `Collection`, Collections UI, Save dialog | FR-19–21 |
| Sync | `modules/sync` | Sync engine, tombstones, last-write-wins, status | FR-16, FR-18 |
| Persistence | `modules/persistence` | Local storage adapters, secret encryption | NFR-02, NFR-03 |
| Shell | `src/` | Tauri bootstrap, TanStack Router routes, header/sidebar, theme, composition root, application context | NFR-01, NFR-04, NFR-05 |

```text
modules/
├── request/
│   ├── application/services/request.service.ts
│   ├── infrastructure/network/
│   │   ├── fetch-http-client.ts
│   │   └── tauri-http-client.ts
│   ├── ports/http-client.interface.ts
│   ├── presentation/                    # builder UI
│   └── types/http.types.ts
├── response/
├── environment/
├── account/
├── project/
├── sync/
└── persistence/
src/
├── app/                     # composition root + VIEW_TO / MAIN_NAV
├── routes/                  # TanStack Router file routes
│   ├── application/         # layout + workspace|collections|environment|settings
│   ├── sign-in.tsx
│   └── sign-up.tsx
├── state-management/        # ApplicationProvider context for child routes
├── shell/
└── views/                   # shared panels/dialogs (page *View.tsx → TODO DELETED)
```

Each module owns repository **ports** in its own `ports/` folder. Concrete storage implementations live in `modules/persistence/`.

---

## 4. Key Technical Decisions

### 4.1 HTTP transport (resolves ARCHITECTURE §17, question 1 and 3)

The Application layer depends on the `HttpClient` port. Adapters are injected at the composition root.

```ts
// modules/request/ports/http-client.interface.ts
export type TransportResult =
  | {
      kind: "response";            // any status, including 4xx and 5xx
      status: number;
      statusText: string;
      headers: { key: string; value: string }[];
      body: string;
      contentType: string | null;
      durationMs: number;
    }
  | {
      kind: "transport-error";     // no HTTP response was received
      code: "network" | "timeout" | "dns" | "tls" | "blocked" | "unknown";
      message: string;
      durationMs: number | null;
    };

export interface HttpClient {
  send(req: PreparedRequest, opts?: { timeoutMs?: number }): Promise<TransportResult>;
}
```

```ts
// modules/request/application/services/request.service.ts
export type SendResult =
  | { status: "invalid"; issues: { field: "url" | "body"; message: string }[] }
  | { status: "http-response"; response: ResponseView }
  | { status: "network-error"; message: string; durationMs: number | null };

export class RequestService {
  constructor(
    private readonly http: HttpClient,
    private readonly resolver: EnvResolver,
  ) {}

  async send(draft: RequestDraft): Promise<SendResult> {
    const resolved = await this.resolver.resolve(draft);
    const issues = validate(resolved);
    if (issues.length > 0) return { status: "invalid", issues };

    const result = await this.http.send(prepare(resolved));
    return result.kind === "response"
      ? { status: "http-response", response: toResponseView(result) }
      : { status: "network-error", message: result.message, durationMs: result.durationMs };
  }
}
```

`SendResult` maps one-to-one to the UI's `SendState` (UI/UX Spec §16).

**Decision:** Fetch inside the Tauri webview is subject to CORS and capability limits, which will block many real APIs. Phase 2 includes a spike. Default plan: ship a **Tauri HTTP plugin adapter** (Rust-side requests, scoped in Tauri capabilities) as the production adapter and keep `FetchHttpClient` for tests and dev.

| Option | Pros | Cons |
|---|---|---|
| `FetchHttpClient` only | Simplest, easy to mock | CORS and permission limits break many APIs |
| Tauri HTTP plugin adapter | Bypasses CORS, native TLS, still behind the port | Needs capability scopes; verify response-body handling |
| Both, via the port | Best of each, fully testable | One more adapter to maintain |

### 4.2 Local persistence (resolves ARCHITECTURE §17, question 2)

| Option | Pros | Cons |
|---|---|---|
| SQLite (Tauri SQL plugin) | Relational, soft deletes, easy sync queries (`updatedAt`, `deletedAt`) | Needs migrations |
| Tauri store (key-value JSON) | Very simple | Weak for hierarchy queries and sync scans |

**Decision (Phase 1 spike to confirm):** SQLite for projects, collections, saved requests, env vars, and settings. The ad-hoc draft may live in the same database as one row. Repositories sit behind ports so the choice can change.

### 4.3 Secrets at rest

- Field-level encryption for env values and auth fields (`password`, `token`, `apiKey`).
- Store the encryption key in the OS keychain (accessed through a Rust command), never next to the database.
- Local password auth stores a one-way hash only (Argon2 in Rust). Plaintext credentials never sync.
- Logs record method, host, timing, and error category only.

### 4.4 Response rendering

- Use a read-only **CodeMirror 6** view for response bodies and the fullscreen modal: it virtualizes by viewport, supports JSON and HTML highlighting, and keeps the DOM small for large payloads.
- HTML is shown as highlighted source and never executed.
- Format detection (`json` / `html` / `raw`) happens in `modules/response`, off the render path.
- **Copy always uses `ResponseView.body`**, never the rendered slice (AC-09).

| Option | Pros | Cons |
|---|---|---|
| CodeMirror 6 | Viewport virtualization, highlighting, search, same component for editor | Bundle size cost; configure language packs lazily |
| Prism/Highlight.js + virtual list | Small | Hand-rolled virtualization and line handling |
| Shiki | Excellent highlighting | Heavy for a 50 MB target and large payloads |

Load language packs lazily so startup stays under the 350 ms target.

### 4.5 Stale sends

UI v1.0 disables **Send** while a request is in flight and has no Cancel button. `RequestService` still tags each send with a token and ignores results from superseded sends, which covers ARCHITECTURE §11 without adding cancel UI.

### 4.6 State management and navigation

- Workspace state is a discriminated union (`SendState`, `SaveState`, unresolved placeholders), per UI/UX Spec §16.
- Shared shell state (draft, send, session-derived fields, projects, env vars, preferences, sync helpers) lives in the `/application` layout and is passed to child routes via `ApplicationProvider` (`src/state-management/application-context.tsx`).
- **Screen navigation uses TanStack Router**, not `useState` view switching. Paths are defined in `src/app/navigation.ts` (`VIEW_TO`). Auth and main views are separate routes; overlays (Variables drawer, Save dialog, fullscreen, Cloud link) stay on the application layout.
- Component-local state for editors, tabs, and drawers.

---

## 5. Implementation Phases

### Phase 0: Foundation, Shell, and Design System

**Goal:** A solid desktop shell, module skeleton, and design tokens.

**Tasks:**

- [x] Confirm Tauri 2 + React + Vite + TypeScript (strict) builds
- [x] Add lint and format
- [x] Create `modules/{request,response,environment,account,project,sync,persistence}` with thin public exports
- [x] Define shared types from DATA_MODEL: `HttpMethod`, `BodyType`, `AuthType`, `EnvVarRole`, `KeyValuePair`, `AuthConfig`, `RequestDraft`, `ResponseView`
- [x] Implement design tokens and light/dark themes (UI §11)
- [x] Build shared components: buttons, inputs, secret input with reveal, tabs, key/value row, dialog, drawer, toast, empty state, split panel (UI §11.5)
- [x] Build the app shell: sidebar (Workspace, Collections, Environment, Settings), icon-only collapse under 1280 px, 960×600 minimum window (UI §3)
- [x] Add header placeholders: request name, Variables button, sync indicator (static "Local only"), account menu
- [x] Open directly into the Workspace (action-first)
- [x] Set up composition root (`src/`) with manual injection
- [x] Document `pnpm tauri dev` and build in the README
- [x] **(Post-MVP)** Migrate shell navigation from `useState<AppView>` / `setView` to TanStack Router file routes; extract page views into `src/routes/`; share layout state via `ApplicationProvider` (ARCHITECTURE ADR-008)

**Acceptance criteria:**

- App builds and launches as a desktop window; modules and shared types compile
- Four views are navigable; theme switches between light and dark
- No browser-extension manifest or popup-only entry points
- UX-WS-01, UX-A11Y-01 (focus and keyboard on shell controls)
- Screens are route-backed (`/application/*`, `/sign-in`, `/sign-up`); no live `setView` navigation

**PRD:** Constraints, NFR-01, NFR-04, NFR-05.
**Dependencies:** None.

---

### Phase 1: Local Persistence and Secrets

**Goal:** Persist entities locally without cloud or sign-in.

**Tasks:**

- [x] Run the persistence spike and record the decision as an ADR (SQLite vs Tauri store, section 4.2)
- [x] Define repository ports in owning modules; implement adapters in `modules/persistence`
- [x] Repositories for `AdHocRequest`, `EnvironmentVariable`, `Project`, `Collection`, `SavedRequest`, `UserSettings`, `UserAccount`, `Session`
- [x] Include `createdAt`, `updatedAt`, and `deletedAt` (tombstones) on syncable entities
- [x] Guest path: ad-hoc draft and env vars with `userId = null`
- [x] Enforce unique (`userId`, `key`) for non-deleted env vars
- [x] Implement field-level encryption with the key held in the OS keychain
- [x] In-memory repository fakes for unit tests
- [x] Persist the ad-hoc draft with debounced writes; guard against losing unsaved work on crash

**Acceptance criteria:**

- Create, update, and load all entities offline
- Secrets are not stored as plaintext on disk
- The ad-hoc draft survives an app restart
- Local project/collection/request load meets the 450 ms target

**PRD:** FR-16, FR-18, AC-15, NFR-02, NFR-03; DATA_MODEL §5.
**Dependencies:** Phase 0.

---

### Phase 2: Request Engine and Variable Resolver

**Goal:** Execute HTTP requests independently of the UI.

**Tasks:**

- [x] Define the `HttpClient` port and `TransportResult` (section 4.1)
- [x] Implement `FetchHttpClient`
- [x] Run the transport spike (CORS, permissions, body handling); implement the Tauri HTTP adapter if chosen, with minimal capability scope
- [x] Implement the pure `EnvResolver`: replace `{{key}}` in URL, params, headers, body, and auth fields (AC-12); report unresolved keys
- [x] Implement `RequestService`: resolve → validate → prepare → send → map to `SendResult`
- [x] Build URL from base URL plus enabled query params only
- [x] Apply headers and `AuthConfig` only when `auth.enabled`:
  - Token → `Authorization: Bearer …`
  - API key → configured header name
  - Username/password → Basic
- [x] Send body only when the method supports it and `bodyType ≠ none` (GET disabled; see UI open decision #1)
- [x] Validate before sending: URL, header names, JSON body when `bodyType = json`
- [x] Detect `contentType` and `bodyFormat` (`json` / `html` / `raw`) without assuming JSON
- [x] Ignore stale results from superseded sends (section 4.5)
- [x] Unit tests with a mocked `HttpClient`: methods, params (enabled only), headers, auth on/off, body types, env resolution, unresolved keys, HTTP 4xx/5xx treated as responses, timeouts, network errors
- [x] Integration test of each real adapter against a local test server

**Acceptance criteria:**

- Valid configs return a structured response or a clear categorized error
- Auth disabled → no auth headers; enabled → configured method applied
- 4xx and 5xx are returned as `http-response`, never as `network-error`
- Placeholder resolution uses current env vars
- UX-WS-08, UX-WS-09, UX-WS-10 (engine-side)

**PRD:** FR-02–07, AC-03–07, AC-12; NFR-01.
**Dependencies:** Phases 0–1.

---

### Phase 3: Workspace and Request Builder UI

**Goal:** Build and send an ad-hoc request in under 30 seconds (UI §5).

**Tasks:**

- [x] Split layout: resizable request editor and response region with minimum heights
- [x] Request row: method selector (default from `UserSettings.defaultHttpMethod`), URL field, **Send**
- [x] Placeholder styling in fields: resolved vs **Not defined** with **Fix variable** action
- [x] Tabs: **Params**, **Headers**, **Body**, **Auth**
- [x] Key/value editors with enable/disable, explicit **Add** action (disabled until last row has key+value), URL ↔ params sync that does not delete unrelated params
- [x] `MentionInput` on pair values: type `{{` to pick env keys; secret keys show masked previews
- [x] Body: None / JSON / Raw editor, inline JSON validation, disabled state for GET with explanation
- [x] Auth: enable toggle and Token / API key / Username-password fields, masked with reveal
- [x] Send states: idle, invalid (inline errors), sending (**Sending…**, duplicate sends blocked), HTTP response, network failure with **Try again**
- [x] Keep the previous response visible, labeled **Previous response**, while sending
- [x] Persist and restore `AdHocRequest` so edit and resend works (AC-02)
- [x] Header shows **Unsaved changes** / **Saved** state when relevant
- [x] Keyboard: Send (`Ctrl/Cmd+Enter`), New Request (`Ctrl/Cmd+N`)

**Acceptance criteria:**

- AC-01–07 satisfied from the UI
- UX-WS-01–05, UX-WS-08–10
- Editor stays responsive during sends; editor navigation meets the 450 ms target

**PRD:** FR-01–07.
**Dependencies:** Phase 2.

---

### Phase 4: Response Viewer

**Goal:** Inspect responses clearly (UI §5.5).

**Tasks:**

- [x] Summary bar: status, status text, duration, size (derived), text label for success/client error/server error
- [x] Tabs: **Body**, **Headers**
- [x] CodeMirror 6 read-only view with JSON and HTML highlighting; prettify; raw fallback; lazy-load language packs
- [x] HTML shown as source only, never rendered or executed
- [x] **Copy** action that copies the full `ResponseView.body`
- [x] **Wrap lines** toggle (default from `UserSettings.wrapResponseLines`)
- [x] **Fullscreen** modal with the same view, Copy, and Wrap; focus returns to the trigger on close
- [x] Empty states: no request yet, empty body, non-JSON/HTML content
- [x] Network failure panel (distinct from HTTP errors)
- [x] Format detection and prettify run off the main render path for large bodies

**Acceptance criteria:**

- AC-08, AC-09, AC-10
- UX-RS-01–04, UX-WS-08
- A large payload stays scrollable and interactive; copy uses the full payload

**PRD:** FR-08–10.
**Dependencies:** Phases 2–3.

---

### Phase 5: Environment Variables (View and Drawer)

**Goal:** Manage the five suggested PRD roles plus custom keys, and use them in requests (UI §7).

**Tasks:**

- [x] **Environment** view: table of Role, Key, Value, row actions; **Add variable** opens Suggested + Custom sections
- [x] Fixed roles: `authToken`, `apiKey`, `username`, `password`, `baseUrl` (FR-11–14); `custom` freeform keys (FR-14a)
- [x] Key validation via `isValidEnvKey` (`^[A-Za-z_][A-Za-z0-9_]*$`); empty and invalid keys rejected
- [x] Mask secret roles with an explicit reveal and hide; `baseUrl` and `custom` unmasked
- [x] Inline validation: duplicate keys rejected
- [x] Distinguish missing from defined-but-empty values
- [x] **Variables drawer** from the header and from **Fix variable**; reuses the same editor; prompt before closing with unsaved edits; Fix may prefer custom with key prefilled
- [x] Header count of unresolved placeholders
- [x] Storage-truth copy: encrypted on device; synced only when sync is enabled
- [x] Never show secrets in tooltips, toasts, mention popovers, or logs

**Acceptance criteria:**

- AC-11, AC-11a, AC-12, AC-15 (offline create and edit)
- UX-ENV-01, UX-ENV-01a, UX-ENV-02–03, UX-WS-06, UX-WS-07
- Flow B (fix an unresolved variable) works without leaving the request

**PRD:** FR-11–14, FR-14a.
**Dependencies:** Phases 1–3.

---

### Phase 6: Accounts, Auth Screens, and Settings

**Goal:** Optional identity; preferences persist with the account (UI §8, §10).

**Tasks:**

- [x] **Sign Up** and **Sign In** screens with **Continue without account**
- [x] Local-first auth: create and verify accounts offline (Argon2 hash); create a `Session`
- [x] Optional cloud link via `cloudUserId` (wired in Phase 8)
- [x] Account menu in the header: Sign in, or display name with Sign out
- [x] **Settings** view: Account, Appearance (theme), Request defaults (default method), Response (wrap lines), Sync (toggle, status, last synced, **Sync now**), About
- [x] Persist `UserSettings`; apply on next launch (immediate apply allowed)
- [x] Guests use defaults; Sync is disabled with "Sign in to enable cloud sync" (UI open decision #2)

**Acceptance criteria:**

- AC-13, AC-14
- UX-ACC-01, UX-ACC-02
- Core request workflows still work signed out and offline

**PRD:** FR-15–17.
**Dependencies:** Phases 1, 3 (shell).

---

### Phase 7: Projects, Collections, and Saved Requests

**Goal:** Optional organization hierarchy (UI §6, §9.2).

**Tasks:**

- [x] **Collections** view: tree of Project → Collection → Request with expand/collapse; rows show request name and method label
- [x] Create, rename, delete for projects and collections via dialogs
- [x] **Save Request** dialog: name, project, collection (create inline if needed)
- [x] Save an ad-hoc draft by copying it into a `SavedRequest`; the ad-hoc draft stays editable
- [x] Open a saved request in the Workspace; edit and resend (AC-19)
- [x] Rename and delete saved requests
- [x] Cascade soft-delete with confirmation that states exactly what is deleted
- [x] Signed-out state: sign-in prompt in Collections and the Save dialog; Workspace never blocked
- [x] Respect `sortOrder`; virtualize long trees

**Acceptance criteria:**

- AC-17, AC-18, AC-19
- UX-CH-01–03
- Ad-hoc path remains available with nothing selected

**PRD:** FR-19–21.
**Dependencies:** Phases 1, 3, 6.

---

### Phase 8: Cloud Sync

**Goal:** Optional sync that never blocks offline use.

**Prerequisite:** Sync backend decided — Firebase Auth + Firestore ([ADR-006](./adr/ADR-006-firebase-sync.md)).

**Tasks:**

- [x] Define `SyncRemote` port and implement the chosen backend adapter (`FirebaseSyncRemote` + `FakeSyncRemote`)
- [x] Sync `UserSettings`, `Project`, `Collection`, `SavedRequest`, `EnvironmentVariable`
- [x] Never sync `Session`, `AdHocRequest`, or `ResponseView`
- [x] Last-write-wins by `updatedAt`; soft-delete tombstones, purged after sync (DATA_MODEL §5)
- [x] TLS in transit; secrets stay encrypted; never sync plaintext credentials
- [x] Run sync only when `syncEnabled` and the network is available; never block startup or navigation
- [x] Header sync indicator with all states: Local only, Offline, Syncing…, Synced, Sync failed. Retry (UI §4.2)
- [x] Retry and error feedback; local data is always preserved
- [x] Unit tests for merge, tombstones, and conflict rules with in-memory fakes

**Acceptance criteria:**

- AC-15, AC-16
- UX-SYNC-01, UX-SYNC-02
- No data loss on merge; full offline use when sync is unavailable

**PRD:** FR-16, FR-18, NFR-02, NFR-03.
**Dependencies:** Phases 1, 5, 6, 7.

---

### Phase 9: Integration, Hardening, and Release

**Goal:** Meet acceptance criteria and success metrics.

**Tasks:**

- [x] E2E: ad-hoc send → response → copy / fullscreen
- [x] E2E: env vars → placeholder resolution → each auth method
- [x] E2E: sign up → project → collection → save → reopen → resend
- [x] E2E: offline create → later sync
- [x] Performance: initial window ≤ 350 ms, editor navigation ≤ 450 ms, local data load ≤ 450 ms, UI actions ≤ 100 ms (profiled on documented reference hardware)
- [x] Package size target under 50 MB where feasible
- [x] Accessibility pass: keyboard reach, focus visibility, no color-only status, contrast checks in both themes
- [x] Security pass: secret storage, logs, sync, Tauri capability scopes
- [x] Production Tauri builds for supported desktop targets
- [x] Fix critical bugs; update docs (section 11)

**Acceptance criteria:**

- All AC-01–AC-19 covered, or explicitly deferred with a PRD amendment
- No critical defects; Definition of Done satisfied
- Out-of-scope features remain unimplemented

**PRD:** §5 Acceptance Criteria, §7 Success Metrics.
**Dependencies:** Phases 0–8.

---

### Phase 10: TanStack Router migration (navigation)

**Goal:** Replace hardcoded `useState` view switching with URL-backed TanStack Router routes.

**Tasks:**

- [x] Add TanStack Router + file route tree; mount `RouterProvider` from `src/main.tsx`
- [x] Move application shell to `src/routes/application/route.tsx` (sidebar, header, overlays, shared hooks)
- [x] Extract Workspace, Collections, Environment, Settings page UI into child routes under `/application/*`
- [x] Extract Sign In / Sign Up into `/sign-in` and `/sign-up`
- [x] Replace `setView` / `onNavigate` with `navigate` / `Link` and `VIEW_TO` path helpers
- [x] Introduce `ApplicationProvider` (`src/state-management/application-context.tsx`) for child-route access to shared shell state
- [x] Mark legacy `src/App.tsx` and page-level `*View.tsx` files as **TODO DELETED**
- [x] Update ARCHITECTURE (ADR-008, stack, structure, state) and this plan

**Acceptance criteria:**

- All former `AppView` screens are reachable by route path
- Sidebar and auth redirects use the router (no live `setView`)
- Shared overlays still work from the application layout
- Docs describe the new navigation model

**PRD:** NFR-04 (usability / navigation), NFR-01 (shell responsiveness).
**Dependencies:** Phases 0–9 (MVP shell and views already shipped).

---

### Phase 11: Team Collaboration (Firebase)

**Goal:** Multi-user teams on Firebase Auth + client Firestore (Spark) without changing personal local-first sync.

**Details:** Chunked plan and feature SoT — [`features/team-collaboration/`](./features/team-collaboration/), [ADR-009](./adr/ADR-009-team-collaboration-firebase.md), [ADR-010](./adr/ADR-010-team-policy-module.md). Do not duplicate matrices or schema here.

**Exit criteria:** Alpha slices (teams/members → invites → team projects → clone) via `FirestoreTeamRemote` + security rules (no Blaze / Functions required).

**Dependencies:** Phases 6, 8, 10 (account + Firebase link + routing).

---

## 6. Dependencies and Parallel Tracks

| Phase | Depends on |
|---|---|
| 0 Foundation | None |
| 1 Persistence and secrets | 0 |
| 2 Request engine | 0, 1 |
| 3 Workspace UI | 2 |
| 4 Response viewer | 2, 3 |
| 5 Environment | 1, 2, 3 |
| 6 Accounts and settings | 1, 3 |
| 7 Projects and collections | 1, 3, 6 |
| 8 Cloud sync | 1, 5, 6, 7 |
| 9 Release | 0–8 |
| 10 TanStack Router migration | 0–9 |
| 11 Team Collaboration | 6, 8, 10 |

After Phase 2, run in parallel: **Workspace → Response (3 → 4)**, **Environment (5)**, **Accounts (6)**. Then **Projects (7)** → **Sync (8)** → **Release (9)**. **Phase 10** refactors navigation after MVP. **Phase 11** adds teams on Firebase.

---

## 7. Out of Scope (Do Not Implement)

- Automated, scheduled, or CI-based testing; test runner; scripts; test results
- Load, stress, or performance testing
- Mock servers
- GraphQL, WebSocket, gRPC
- OpenAPI/Swagger import, documentation generation, code or SDK generation
- Real-time multi-user editing
- Mobile apps; browser-extension or browser-tab packaging
- Personal request history and response archives
- Multiple named environments and an environment selector (personal)
- Folders inside collections; duplicate and move actions
- Import/export
- Cookies viewer; request cancel button; command palette

---

## 8. Requirements Traceability

| Requirement | Phase(s) | UI/UX criteria |
|---|---|---|
| FR-01 / AC-01–02 Ad-hoc | 1, 3 | UX-WS-01, 04, 05 |
| FR-02–06 / AC-03–06 Builder | 2, 3 | UX-WS-02, 03, 10 |
| FR-07 / AC-07 Auth | 2, 3 | UX-WS-09 |
| FR-08–10 / AC-08–10 Response | 4 | UX-RS-01–04 |
| FR-11–14 / AC-11–12 Env vars | 2 (resolver), 5 | UX-ENV-01–03, UX-WS-06, 07 |
| FR-15 / AC-13 Accounts | 6 | UX-ACC-01 |
| FR-16, FR-18 / AC-15–16 Offline and sync | 1, 8 | UX-SYNC-01, 02 |
| FR-17 / AC-14 Settings | 6 | UX-ACC-02 |
| FR-19–21 / AC-17–19 Hierarchy | 7 | UX-CH-01–03 |
| NFR-01 Performance | 0, 2–4, 9 | UX-PERF-01 |
| NFR-02 Security | 1, 5, 8, 9 | UX-ENV-02 |
| NFR-03 Reliability | 1, 8, 9 | UX-SYNC-01 |
| NFR-04 Usability | 3–7, 9 | UX-A11Y-01, 02 |
| NFR-05 Portability | 0, 9 | None |

---

## 9. Open Decisions and Risks

### Open decisions

| # | Decision | Blocks | Default assumption |
|--:|---|---|---|
| 1 | **Cloud sync backend** (hosted service or custom API). No document defines it | ~~Phase 8~~ | **Resolved:** Firebase Auth + Firestore ([ADR-006](./adr/ADR-006-firebase-sync.md)); same email+password cloud link |
| 2 | Production HTTP adapter (Fetch vs Tauri HTTP plugin) | ~~Phase 2~~ | **Resolved:** Tauri HTTP plugin in production; Fetch for tests and non-desktop runs |
| 3 | Local store (SQLite vs Tauri store) | ~~Phase 1~~ | **Resolved:** SQLite ([ADR-005](./adr/ADR-005-local-persistence.md)) |
| 4 | Body editor allowed for DELETE? | Phase 2–3 | Yes; only GET is disabled |
| 5 | Do guests persist preferences? | ~~Phase 6~~ | **Resolved:** No; in-session tweaks allowed, never persisted; relaunch uses defaults |
| 6 | Saved requests: explicit save or autosave | ~~Phase 7~~ | **Resolved:** Explicit **Save Request** only; in-place update when already bound |
| 7 | Custom variable keys beyond the five roles | ~~Phase 5~~ | **Resolved:** Allowed — `EnvVarRole.custom` + `isValidEnvKey` (FR-14a / UI_UX_SPEC decision 4) |

### Risks

| Risk | Impact | Mitigation |
|---|---|---|
| CORS and webview limits break real APIs with Fetch | High | Transport spike in Phase 2; Tauri HTTP adapter behind the same port |
| ~~No defined sync backend~~ | — | **Resolved:** ADR-006 Firebase |
| Large responses freeze the UI | Medium | CodeMirror viewport rendering; format detection off the render path; profile early |
| Conflating HTTP 4xx/5xx with transport failure | High | Separate `TransportResult` kinds; tests in Phase 2 |
| Secrets leak through logs or sync | High | Log allowlist; key in keychain; security pass in Phase 9 |
| Over-layering slows delivery | Medium | KISS; create folders only when needed |
| Performance targets are missed | Medium | Lazy-load language packs; measure each phase on reference hardware |

---

## 10. Definition of Done

A task is done when:

- [ ] Mapped acceptance criteria (PRD AC and `UX-*`) are met
- [ ] TypeScript strict checks and lint pass
- [ ] Relevant automated tests pass (engine, resolver, and repositories are required)
- [ ] The offline path still works for the affected feature
- [ ] Secrets handling follows NFR-02
- [ ] Module and layer boundaries are respected (no transport calls from Presentation)
- [ ] No out-of-scope features are introduced
- [ ] Docs are updated when behavior or schema changes

---

## 11. Doc Alignment Fixes Needed

| Document | Fix |
|---|---|
| ~~ARCHITECTURE §1.4 / module list~~ | ~~Remove "folders"~~ — **Done:** project module notes no nested folders |
| ~~ARCHITECTURE §17~~ | ~~Mark transport/persistence questions resolved~~ — **Done** (+ ADR-007 HTTP scopes) |
| ~~ARCHITECTURE §12~~ | ~~Add persistence / presentation~~ — **Done** |
| ~~ARCHITECTURE §11~~ | ~~Stale-send token; no Cancel~~ — **Done** |
| ~~DATA_MODEL~~ | ~~`ResponseView.size` derived~~ — **Done** |
| ~~UI_UX_SPEC~~ | ~~Open decisions 1–6~~ — **Done** (Phase 9) |
| ~~PRD / DATA_MODEL / UI_UX_SPEC / IMPLEMENTATION_PLAN~~ | ~~Custom env vars + pair fill-before-add + MentionInput~~ — **Done** (2026-11-02) |
| ~~PRD~~ | ~~Add a sync backend requirement~~ — **Done:** FR-16 references Firebase / ADR-006 |
| ~~ARCHITECTURE §4 / §8 / §12 / ADR-008~~ | ~~Document TanStack Router migration~~ — **Done** (Phase 10) |
| ~~IMPLEMENTATION_PLAN §1 / §4.6 / Phase 10~~ | ~~Record navigation migration from `setView` to routes~~ — **Done** |
| App.tsx + page `*View.tsx` | Delete files marked **TODO DELETED** when no longer needed for reference |

---

## 12. Progress Tracker

| Phase | Status | Done | Notes |
|---|---|---:|---|
| 0 Foundation, shell, design system | Completed | 12/12 | Shell + Stitch tokens/UI shells; later TanStack Router task checked under Phase 0 / Phase 10 |
| 1 Persistence and secrets | Completed | 9/9 | SQLite + keychain encryption; guest draft/env persist |
| 2 Request engine and resolver | Completed | 13/13 | Tauri HTTP plugin in production; Fetch for tests and non-desktop runs |
| 3 Workspace and builder UI | Completed | 13/13 | Wired to RequestService; SendState + URL↔params + placeholders; PairEditor fill-before-add; MentionInput |
| 4 Response viewer | Completed | 10/10 | CodeMirror 6 + prettify; copy uses raw body; fullscreen focus restore |
| 5 Environment variables | Completed | 10/10 | Shared editor + Variables drawer; custom keys (FR-14a); Fix variable Flow B |
| 6 Accounts and settings | Completed | 7/7 | Argon2 local auth + Session restore; UserSettings persist when signed in; guests defaults-only |
| 7 Projects and collections | Completed | 9/9 | ProjectService + Collections tree + Save dialog; cascade soft-delete; Workspace bind/open/resave |
| 8 Cloud sync | Completed | 9/9 | Firebase Auth + Firestore; SyncRemote + LWW engine |
| 9 Integration and release | Completed | 10/10 | Playwright E2E (Vite harness); perf notes; a11y/security pass; Linux release build |
| 10 TanStack Router migration | Completed | 8/8 | File routes + ApplicationProvider; legacy App/`*View` marked TODO DELETED |

**Status values:** `Not Started`, `In Progress`, `Blocked`, `Completed`.

**How to update:** Check off tasks with `[x]` in the phase sections above, then refresh the Done counts and Status in this table. A phase is `Completed` only when every task checkbox is `[x]` and its acceptance criteria are met.