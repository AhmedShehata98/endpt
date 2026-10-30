# UI/UX Specification — Endpt

**Document type:** Product UI/UX specification
**Version:** 2.0 (PRD-aligned rewrite of v1.0 "Relay API")
**Status:** MVP design baseline
**Source of truth:** [PRD.md](./PRD.md). Supporting docs: [DATA_MODEL.md](./DATA_MODEL.md), [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)
**Platform:** Desktop only (Tauri 2 + React + TypeScript). No browser tab, no browser-extension side panel, no mobile.

> Rule: if this document and the PRD ever disagree, the PRD wins. Do not add UI for capabilities the PRD or DATA_MODEL does not define.

---

## 0. What changed from v1.0

| Area | v1.0 (Relay API) | v2.0 (Endpt) |
|---|---|---|
| Product name | Relay API | **Endpt** |
| Platform | Browser tab / extension side panel | **Desktop only (Tauri)** |
| Protocols | REST + GraphQL | **REST only** (GET, POST, PUT, PATCH, DELETE) |
| Top-level views | 6 (incl. History, Test Runner) | **4 views** + 2 auth screens + overlays |
| History / Test Runner / Scripts / Test Results | Included | **Removed** |
| Organization | Collections + folders | **Project → Collection → Request** (no folders) |
| Environments | Multiple named environments + selector | **Flat environment variables** (5 fixed roles), no selector |
| Auth types | No Auth, Bearer, Basic, "others" | **Enable toggle + Token / API key / Username-password** |
| Response tabs | Body, Headers, Cookies, Test Results | **Body, Headers** |
| Large responses | "Load More" progressive reveal | **Virtualized rendering**; Copy and Fullscreen always use the full payload |
| Body formats | JSON, HTML, XML, others | **JSON and HTML highlighted**, raw fallback |
| Accounts / sync | Not specified | **Sign In, Sign Up, sync status, offline state** |
| Settings | Shortcuts, history retention, import/export, editor prefs | **Theme, default method, wrap lines, sync, account** |
| Import / export | Dialogs and entry points | **Removed** (not in PRD) |
| Response fullscreen | Not in body | **Added** (FR-10) |

---

## 1. Product Vision

Endpt is a lightweight desktop API client. It makes testing and integrating with backend endpoints fast, with minimal setup.

> Send an HTTP request in under 30 seconds, see exactly what came back, and never be forced into structure you did not ask for.

### Principles

- **Action first:** Open directly into the workspace. No dashboard, no marketing page.
- **Ad-hoc first:** Sending a request never requires an account, project, collection, or network setup (FR-01, AC-01).
- **Local-first:** Everything core works offline. Cloud sync is optional and never blocks the UI (FR-16, FR-18).
- **Contextual editing:** Fix variables and auth without leaving the current request.
- **Visible state:** Show send status, save state, unresolved variables, sync/offline status.
- **Safe by default:** Mask secrets; never show them in tooltips, toasts, or logs.
- **Predictable:** Switching tabs or views never silently erases request configuration.
- **Low overhead:** No decorative animation or effects. Do not render large payloads all at once.
- **Keyboard friendly:** Core actions (Send, Save, Copy) are reachable without a mouse.

---

## 2. MVP Scope

### In scope (PRD §2)

- HTTP request builder: URL, method, body, body type, query params, headers
- Ad-hoc requests without a project or collection
- Authentication: token, API key, username/password
- Response viewer: prettified output, syntax highlighting (JSON, HTML), copy, fullscreen
- Environment variables: auth token, API key, username/password, base URL
- Accounts: sign up / sign in, settings, preferences
- Local-first storage, optional cloud sync, full offline use
- Project → Collection → Request organization

### Out of scope (do not design or build)

Automated/scheduled/CI testing, test runner, scripts, load testing, mock servers, GraphQL / WebSocket / gRPC, OpenAPI import, documentation or code/SDK generation, team collaboration, mobile, request history, multiple named environments, folders, import/export, cookies viewer, browser-extension packaging.

---

## 3. Information Architecture

### Top-level views (4)

| # | View | Purpose | Primary action | PRD |
|--:|---|---|---|---|
| 1 | **Workspace** | Build, send, and inspect a request | Send | FR-01–10 |
| 2 | **Collections** | Organize projects, collections, and saved requests | Open / Save request | FR-19–21 |
| 3 | **Environment** | Manage environment variables | Add variable | FR-11–14 |
| 4 | **Settings** | Preferences, account, sync | Save preference | FR-15–17 |

### Auth screens (2)

| Screen | Purpose | PRD |
|---|---|---|
| **Sign In** | Authenticate an existing account | FR-15, AC-13 |
| **Sign Up** | Create an account | FR-15, AC-13 |

Both are optional. A **Continue without account** action leads straight to the Workspace.

### Overlays (not pages)

Response fullscreen modal, Save Request dialog, Create/Rename dialogs (project, collection), Delete confirmation, Variables drawer, Sign-in prompt.

### Global navigation

Compact left sidebar, 232–248 px at 1280 px and wider. Order:

1. Product mark and name
2. **New Request** (primary action)
3. Workspace
4. Collections
5. Environment
6. Settings (anchored to bottom, with account/sync status above it)

### Window sizing

| Width | Layout |
|---|---|
| ≥ 1280 px | Full sidebar (232–248 px) |
| 960–1279 px | Icon-only sidebar (about 56 px) with tooltips |
| Minimum window | 960 × 600 px |

There is no side-panel layout. Request and response are always stacked vertically in the Workspace.

---

## 4. Application Shell

### 4.1 Workspace header

Show the minimum needed to orient the developer:

- Request name, or **Untitled Request**
- Breadcrumb **Project / Collection** when the request is saved
- Save state: **Unsaved changes**, **Saved**, or nothing for an ad-hoc draft
- **Variables** button (opens the Variables drawer; shows a count of unresolved placeholders when above zero)
- **Sync status indicator** (see 4.2)
- Account menu (Sign in, or user display name with Sign out)

There is no environment selector. Variables are a single flat set per user.

### 4.2 Sync and offline status

A small text-plus-icon indicator in the header. Never color alone.

| State | Label | When |
|---|---|---|
| Local only | **Local only** | Signed out, or `syncEnabled` is off |
| Offline | **Offline, changes saved locally** | Sync enabled, no network |
| Syncing | **Syncing…** | Sync in progress |
| Synced | **Synced** (tooltip: last synced time) | Last sync succeeded |
| Error | **Sync failed. Retry** | Sync error; data is safe locally |

Clicking the indicator opens Settings → Sync. Sync never blocks sending requests or editing.

### 4.3 Notifications

Inline messages for errors tied to a field or task. Toasts only for brief confirmations such as "Request saved". Never use a toast as the only place for an error the user must fix.

### 4.4 Destructive actions

Confirm deleting a project, collection, saved request, or environment variable when irreversible. State exactly what will be deleted (for example, "Deletes 3 collections and 12 requests"). Do not confirm ordinary edits.

---

## 5. View 1: Workspace

**Priority:** P0. Design and validate first.

### 5.1 Layout

A vertically resizable split inside one workspace:

- Request editor on top
- Response viewer below
- Draggable divider with visible hover and focus states
- Minimum heights so neither region becomes unusable

Both regions are visible in the initial viewport whenever the window height allows.

### 5.2 Request header row

One row: **method selector**, **URL field**, **Send** button.

- Method selector shows text labels (GET, POST, PUT, PATCH, DELETE), not color alone. The default method comes from `UserSettings.defaultHttpMethod`.
- URL field takes the remaining width. It accepts `{{baseUrl}}` and other `{{key}}` placeholders.
- Resolved placeholders get a subtle distinct style (not button-like). Unresolved ones show a textual **Not defined** state and a **Fix variable** action.
- **Save Request** is a secondary action near the request name and opens the Save dialog. Saving never interrupts sending or resets fields.

### 5.3 Request configuration tabs

Tab order: **Params**, **Headers**, **Body**, **Auth**.

Each tab may show a small count or state indicator (for example, number of enabled params).

#### Params (FR-05, AC-05)

- Editable rows: enabled checkbox, key, value, remove
- Disabled rows stay visible and are not sent
- URL and params stay in sync. Editing the URL must not delete unrelated params
- Explicit **Add parameter** action
- Values may contain `{{key}}`

#### Headers (FR-06, AC-06)

- Same row pattern as Params
- Values may contain `{{key}}`

#### Body (FR-03, FR-04, AC-04)

- Body type: **None**, **JSON**, **Raw**
- Code editor treatment for JSON and Raw
- JSON validation feedback appears next to the editor, not as a global error
- Body is sent only when the method supports it and body type is not None
- Assumption to confirm: the body editor is disabled for **GET** with an explanation ("GET requests do not send a body"). POST, PUT, PATCH, and DELETE enable it

#### Auth (FR-07, AC-07)

- **Enable authentication** toggle. When off, no auth is applied and the fields are collapsed
- When on, choose a type:

| Type | Fields |
|---|---|
| **Token** (Bearer) | Token |
| **API key** | Header name (for example `X-API-Key`), key |
| **Username / password** (Basic) | Username, password |

- Every field accepts `{{authToken}}`, `{{apiKey}}`, `{{username}}`, `{{password}}`
- Show whether a referenced variable resolves
- Secrets are masked by default with an explicit reveal control
- Switching type clears or clearly labels stale fields so misleading configuration is not sent
- Disabling auth keeps the entered values visible on re-enable, but nothing is sent while disabled

### 5.4 Send behavior

- Prevent duplicate sends while a request is in flight
- Show an unmistakable in-progress state (button label **Sending…**) while keeping the configuration visible and editable where safe
- Keep the previous response visible, marked **Previous response**, until the new one arrives
- Resolve `{{key}}` placeholders from environment variables before sending (AC-12)
- If placeholders cannot be resolved, show the inline warning and let the user send anyway or fix the variable first
- Distinguish three outcomes:

| Outcome | Meaning | Display |
|---|---|---|
| **Invalid request** | Locally detectable issue (empty or invalid URL) | Inline error near the field. Nothing is sent |
| **HTTP response** | Any status, including 4xx and 5xx | Normal response viewer with status label |
| **Network failure** | No HTTP response (DNS, TLS, refused, timeout) | Error panel: "Request failed before receiving an HTTP response", with the reason and a **Try again** action |

Cancelling an in-flight request is not part of the MVP.

### 5.5 Response viewer (FR-08–10)

Before the first request, show a lightweight empty state:

> Send a request to inspect the response.

#### Summary bar

- Status code and status text, with a text label (**Success**, **Client error**, **Server error**; never color alone)
- Duration in ms
- Size (derived from the body length)

#### Tabs

**Body**, **Headers**.

#### Body rendering

| Detected format | Rendering |
|---|---|
| JSON | Prettified with syntax highlighting |
| HTML | Prettified with syntax highlighting, shown as source. Never executed or rendered in the app |
| Anything else | Raw text, monospaced, no highlighting |

- Detect format from `contentType`, with a safe fallback to raw. Never assume every body is JSON
- Empty body: show **This response has no body**
- **Wrap lines** toggle, defaulting to `UserSettings.wrapResponseLines`

#### Actions

| Action | Behavior | PRD |
|---|---|---|
| **Copy** | Copies the full response body (`ResponseView.body`), never only the visible slice | FR-09, AC-09 |
| **Fullscreen** | Opens the payload in a fullscreen modal (see 9.1) | FR-10, AC-10 |

#### Large responses

Render with a virtualized viewer so only visible lines are in the DOM. Show a lightweight **Rendering large response…** indicator if needed. There is no "Load More" action: the full payload is always loaded in memory, and Copy and Fullscreen use it directly. No second network request is ever triggered by viewing.

### 5.6 Workspace states to design

- New / empty request
- Valid configuration, ready to send
- Unresolved placeholder
- Invalid URL
- Sending
- Success response (JSON, HTML, raw)
- HTTP error response (4xx, 5xx)
- Network failure or timeout
- Empty response body
- Large response
- Unsaved changes

---

## 6. View 2: Collections

**Priority:** P1. Maps to FR-19–21, AC-17–19.

### Layout

- Page title **Collections**
- A tree: **Project → Collection → Request**
- Request rows show the request name and method label
- Expand and collapse at each level
- Selected item shows a contextual action menu (no large empty detail dashboards)

### Actions (MVP)

| Level | Actions |
|---|---|
| Project | Create, rename, delete |
| Collection | Create, rename, delete |
| Request | Open, rename, delete |

Duplicate, move, folders, and search are not part of the MVP.

### Interactions

- **New Project** and **New Collection** open a small dialog with a name field (and optional description)
- Opening a saved request switches to the Workspace, restores its full draft, and lets the user edit and resend (AC-19)
- Deleting a project or collection states exactly what nested content will be deleted (cascade soft-delete)
- Items order by `sortOrder`

### Signed-out behavior

Projects require an account (AC-17). A signed-out user sees an empty state:

> Sign in to organize requests into projects and collections. Ad-hoc requests work without an account.

with **Sign in** and **Sign up** actions. The Workspace is never blocked.

### States

No projects, project with no collections, collection with no requests, populated, loading, error, operation failed.

---

## 7. View 3: Environment

**Priority:** P1. Maps to FR-11–14, AC-11–12. Environment variables are a **flat set per user**, not named environments.

### Layout

- Page title **Environment**
- One table: **Role**, **Key**, **Value**, row actions
- **Add variable** action

### Roles (fixed)

| Role | Default key | Purpose | Masked |
|---|---|---|---|
| Auth token | `authToken` | Bearer or token value | Yes |
| API key | `apiKey` | API key value | Yes |
| Username | `username` | Basic auth username | Yes |
| Password | `password` | Basic auth password | Yes |
| Base URL | `baseUrl` | Prefix for request URLs | No |

### Rules

- Adding a variable starts with choosing a role, which proposes the default key
- Keys are unique per user (non-deleted rows). Show an inline validation error on duplicates
- Values for secret roles are masked by default with an explicit reveal and hide control
- Never show secret values in tooltips, toasts, logs, or examples
- Distinguish a **missing** variable from a **defined but empty** value
- Use `{{key}}` in URLs, params, headers, body, and auth fields
- Switching views does not mutate saved request text
- Copy states the storage truth: values are encrypted on this device, and synced only when sync is enabled

### Variables drawer

The same editor opens as a side drawer from the Workspace header or from a **Fix variable** action. The user never has to leave the current request to define a missing variable. Closing the drawer with unsaved edits must prompt, not discard.

### States

No variables, populated, validation error, secret masked and revealed, unsaved changes.

---

## 8. View 4: Settings

**Priority:** P2. Maps to FR-15–17, AC-14.

### Sections

| Section | Controls | Data field |
|---|---|---|
| **Account** | Display name, email, Sign out (or Sign in / Sign up when signed out) | `UserAccount` |
| **Appearance** | Theme: System, Light, Dark | `theme` |
| **Request defaults** | Default HTTP method | `defaultHttpMethod` |
| **Response** | Wrap long lines | `wrapResponseLines` |
| **Sync** | Enable cloud sync toggle, status, last synced time, **Sync now** | `syncEnabled`, `lastSyncedAt` |
| **About** | App version | None |

### Rules

- Settings are stored with the account and applied on next launch (AC-14). Applying a change immediately in the current session is allowed
- Sync copy must be accurate: Session, ad-hoc draft, and last response are never synced
- Do not place environment variables here
- Group by user goal, not implementation module

### Signed-out behavior

Account section shows Sign in and Sign up. Sync is disabled with the note "Sign in to enable cloud sync". Whether non-account preferences persist for guests is an open decision (see 16).

---

## 9. Overlays

### 9.1 Response fullscreen modal (FR-10, AC-10)

- Covers the app window, with title **Response**, status summary, and a Close button
- Shows the same prettified and highlighted body, plus **Copy** (full payload) and **Wrap lines**
- Escape or Close returns focus to the **Fullscreen** control

### 9.2 Save Request dialog (FR-21, AC-19)

- Fields: request name (required), project, collection
- If signed out, replace the pickers with a sign-in prompt and keep the ad-hoc draft intact
- Saving copies the draft into a `SavedRequest`. The ad-hoc draft stays editable

### 9.3 Other dialogs

Create/rename project, create/rename collection, delete confirmation. Each has a clear title, one primary action, and a visible cancel. Keep user input intact when validation fails.

### 9.4 Drawers

Variables drawer only (see section 7).

---

## 10. Account Screens

### Sign In (FR-15, AC-13)

- Email, password, **Sign In**
- Links: **Create account**, **Continue without account**
- Inline errors for invalid credentials; no field-clearing on error

### Sign Up (FR-15, AC-13)

- Email, password, optional display name, **Create account**
- Links: **Sign in instead**, **Continue without account**

### Rules

- Local-first: account creation and sign-in must work offline against local storage. Cloud linking happens later, when the network is available and sync is enabled
- Credentials are never stored as plaintext
- These screens are never required to send a request

---

## 11. Design System

### 11.1 Visual direction

Calm, neutral, precise. A focused engineering tool, not a SaaS dashboard. Avoid gradients, glassmorphism, strong shadows, oversized cards, and motion that does not improve feedback.

### 11.2 Color tokens

| Token | Value | Usage |
|---|---|---|
| `color.bg.app` | `#F6F7FB` | App background |
| `color.bg.surface` | `#FFFFFF` | Panels, inputs, dialogs |
| `color.text.primary` | `#101828` | Main text |
| `color.text.secondary` | `#667085` | Supporting text |
| `color.border.default` | `#E4E7EC` | Borders and dividers |
| `color.accent.primary` | `#4F46E5` | Primary actions, focus |
| `color.accent.subtle` | `#EEF2FF` | Selected backgrounds |
| `color.status.success` | `#12B76A` | Success |
| `color.status.error` | `#D92D20` | Error |
| `color.status.warning` | `#DC6803` | Warning |

Dark theme tokens must be defined for `theme = dark`. Verify contrast (WCAG 2.2 AA) for actual pairs before finalizing. Never communicate state through color alone.

### 11.3 Typography

- UI font: Inter or Geist
- Code font: JetBrains Mono or a comparable monospace
- View title 16–20 px, standard text 13–14 px, labels 12–13 px, code 12–14 px

### 11.4 Spacing and geometry

8 px base grid (4 px for fine alignment). Controls 32–36 px tall. 1 px borders. 6–8 px radius. Prefer separators and spacing over extra cards or shadows.

### 11.5 Components to standardize

- Buttons: primary, secondary, ghost, destructive
- Inputs: text, URL, secret (with reveal), select, checkbox, toggle
- Tabs, editable key/value row, data table
- Method label, inline validation message
- Status indicator with text, sync status indicator
- Toast, empty state, loading indicator
- Dialog, drawer, dropdown menu, tooltip
- Code viewer and editor container (virtualized for large content)
- Resizable split panel

Each interactive component needs default, hover, focus-visible, active, disabled, and error/loading states where relevant.

---

## 12. Interaction, Accessibility, and Performance

### Keyboard and focus

- All controls reachable by keyboard in logical order, with visible focus
- Dialogs and drawers move focus in on open and return it to the trigger on close
- Escape closes dismissible overlays unless that would discard unsaved work without warning
- Suggested shortcuts (display next to actions): Send (`Ctrl/Cmd+Enter`), Save (`Ctrl/Cmd+S`), New Request (`Ctrl/Cmd+N`)

### Accessibility (target WCAG 2.2 AA)

- Never use color as the only indicator
- Icon-only actions need accessible names
- Inputs have labels, not placeholder-only
- Respect reduced-motion preferences
- Announce send, validation, and sync status changes to assistive technology where practical
- No focus traps outside modal dialogs

### Performance (NFR-01)

- UI actions respond within 100 ms under normal use
- Virtualize large response bodies and long project/collection trees
- Keep the editor responsive while a request is sending
- Avoid layout shifts and heavy effects
- App size target under 50 MB where feasible

---

## 13. Content and Microcopy

Short, direct, action-oriented labels.

| Context | Copy |
|---|---|
| Primary actions | **New Request**, **Send**, **Save Request**, **Add variable** |
| Empty response | Send a request to inspect the response. |
| Unresolved variable | This variable is not defined. **Fix variable** |
| Network failure | Request failed before receiving an HTTP response. |
| Offline | Offline, changes saved locally |
| Signed-out collections | Sign in to organize requests into projects and collections. |
| Empty body | This response has no body. |

Avoid vague messages such as "Something went wrong" when a specific reason is available.

---

## 14. Key User Flows

### Flow A: First request (AC-01, AC-02)

1. User opens Endpt; the Workspace opens with an empty request
2. Enters a URL, picks a method
3. Optionally adds params, headers, body, or auth
4. Clicks **Send**; sees the in-progress state
5. Response appears in the same workspace
6. Edits the request and resends without creating anything

**Success:** Under 30 seconds, with no account, project, collection, or variable.

### Flow B: Fix an unresolved variable (AC-11, AC-12)

1. Request contains `{{baseUrl}}` that is not defined
2. The field shows **Not defined** with **Fix variable**
3. The Variables drawer opens; the user adds the value
4. The placeholder resolves; request configuration is untouched
5. User sends

### Flow C: Save to a collection (AC-17–19)

1. User builds and sends an ad-hoc request
2. Clicks **Save Request**
3. Picks a project and collection (or creates them), names the request
4. Request appears under the collection
5. Later, opens it from Collections and resends

### Flow D: Work offline, then sync (AC-15, AC-16)

1. Network drops; the header shows **Offline, changes saved locally**
2. User sends requests, edits variables, creates projects and collections
3. Network returns; with sync enabled, the header shows **Syncing…** then **Synced**
4. No data is lost; failures show **Sync failed. Retry** and local data stays intact

### Flow E: Inspect, copy, fullscreen (AC-08–10)

1. A JSON or HTML response is prettified with highlighting
2. User clicks **Copy**; the full body is on the clipboard
3. User clicks **Fullscreen**; the payload shows in a modal
4. Closing the modal returns to the Workspace

---

## 15. Acceptance Criteria and PRD Traceability

| ID | Criterion | PRD |
|---|---|---|
| UX-WS-01 | App opens directly into the Workspace (or last workspace state) | AC-01 |
| UX-WS-02 | Method and URL can be set and sent from the primary row | AC-03 |
| UX-WS-03 | Params, Headers, Body, and Auth are reachable via labeled tabs | AC-04–07 |
| UX-WS-04 | Sending works with no project, collection, account, or network setup | AC-01 |
| UX-WS-05 | Ad-hoc request can be edited and resent | AC-02 |
| UX-WS-06 | Unresolved variables are visibly identified with a **Fix variable** path | AC-12 |
| UX-WS-07 | Variables can be edited without leaving the current request | AC-11 |
| UX-WS-08 | Invalid request, HTTP error response, and network failure are distinct states | Success metric: clear error |
| UX-WS-09 | Auth toggle off sends no auth; on applies the configured method | AC-07 |
| UX-WS-10 | Body is sent only when method and body type allow it | AC-04 |
| UX-RS-01 | JSON and HTML responses are prettified with highlighting | AC-08 |
| UX-RS-02 | Other content types fall back to raw text | AC-08 |
| UX-RS-03 | Copy always places the full payload on the clipboard | AC-09 |
| UX-RS-04 | Fullscreen opens the payload in a modal | AC-10 |
| UX-ENV-01 | Variables can be added for token, API key, username/password, and base URL | AC-11 |
| UX-ENV-02 | Secret values are masked by default and never exposed in tooltips or toasts | NFR-02 |
| UX-ENV-03 | Duplicate keys are rejected inline | DATA_MODEL |
| UX-CH-01 | Project, collection, and request hierarchy is browsable | AC-17–19 |
| UX-CH-02 | Opening a saved request restores its draft for editing and resending | AC-19 |
| UX-CH-03 | Signed-out users see a clear sign-in prompt, not a broken view | AC-17 |
| UX-ACC-01 | Sign up and sign in create an authenticated session | AC-13 |
| UX-ACC-02 | Settings update and apply on next launch | AC-14 |
| UX-SYNC-01 | Core flows work offline; the header states the offline status | AC-15 |
| UX-SYNC-02 | Sync status and failure feedback are visible without blocking the UI | AC-16 |
| UX-A11Y-01 | All controls are keyboard-reachable with visible focus | NFR-04 |
| UX-A11Y-02 | Status is never communicated by color alone | NFR-04 |
| UX-PERF-01 | UI actions respond within 100 ms; large bodies are virtualized | NFR-01 |

---

## 16. UI State Contracts (TypeScript)

Model UI state as discriminated unions rather than several boolean flags. This makes impossible combinations (for example, "sending" and "network error" together) unrepresentable, and lets the compiler force every state to be handled in the UI.

```ts
import type {
  RequestDraft,
  ResponseView,
  EnvVarRole,
} from "modules/shared-types"; // from DATA_MODEL

export type AppView = "workspace" | "collections" | "environment" | "settings";
export type AuthScreen = "sign-in" | "sign-up";

export type SendState =
  | { status: "idle" }
  | { status: "invalid"; issues: { field: "url" | "body"; message: string }[] }
  | { status: "sending"; startedAt: number }
  | { status: "http-response"; response: ResponseView }          // any HTTP status
  | { status: "network-error"; message: string; durationMs: number | null };

export type SyncStatus =
  | { kind: "local-only" }                                       // signed out or sync off
  | { kind: "offline" }
  | { kind: "syncing" }
  | { kind: "synced"; lastSyncedAt: string }
  | { kind: "error"; message: string };

export type SaveState = "ad-hoc" | "saved" | "unsaved";

export interface UnresolvedPlaceholder {
  key: string;                       // e.g. "baseUrl"
  field: "url" | "params" | "headers" | "body" | "auth";
  suggestedRole?: EnvVarRole;
}

export interface WorkspaceState {
  draft: RequestDraft;               // same shape as ad-hoc and saved
  send: SendState;
  save: SaveState;
  unresolved: UnresolvedPlaceholder[];
}
```

**Trade-offs:** unions need an exhaustive `switch` (with a `never` check) in the viewer component, which is a little more code than boolean flags, but it removes a whole class of stale-state bugs. If the `SendState` union grows (for example, adding cancellation later), the compiler flags every place that needs updating.

---

## 17. Design Deliverables and Handoff

1. Workspace: empty, configured, sending
2. Workspace: success response (JSON, HTML, raw)
3. Workspace: HTTP error, network failure, invalid URL
4. Workspace: unresolved variable and Variables drawer (masked and revealed, unsaved changes)
5. Workspace: Auth tab for each type (token, API key, username/password), and disabled
6. Workspace: large response (virtualized)
7. Response fullscreen modal
8. Save Request dialog (signed in and signed out)
9. Collections: empty (signed out), empty (signed in), populated tree
10. Environment: empty and populated
11. Settings (signed in and signed out)
12. Sign In and Sign Up
13. Header sync states (local only, offline, syncing, synced, error)
14. Shared design-system components and tokens (light and dark)

For each interactive component, document default, hover, focus, disabled, loading, empty, validation, and error behavior as applicable.

---

## 18. Open Decisions

| # | Decision | Default assumption |
|--:|---|---|
| 1 | Does the body editor allow DELETE? | Yes. Only GET is disabled |
| 2 | Do guests persist theme and other preferences? | Guests use defaults; persistence needs an account |
| 3 | Are saved requests autosaved or explicitly saved? | Explicit **Save Request** only |
| 4 | Are custom variable keys beyond the five roles allowed? | No (PRD roles first), unless placeholder resolution requires it |
| 5 | Response size threshold for the "Rendering…" indicator | Set after profiling |
| 6 | Export of sensitive data | Not applicable (no export in MVP) |

Resolve these with the PRD owner before implementing the affected UI. Do not render a control for a capability the engine or persistence layer does not support.

---

## 19. Final UX Direction

Endpt should feel like a focused workbench. The default path is always:

**Configure request → Send → Inspect response → Fix or iterate.**

Everything else (accounts, projects, collections, sync) is optional structure that appears only when the user asks for it.