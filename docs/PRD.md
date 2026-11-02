# PRD — Endpt

## 1. Overview
**Purpose:** We are building a developer tool that makes it easy to test and integrate with API URLs and endpoints, without unnecessary complexity, and that improves the development process.

**Problem Statement:** Backend testing and integration are difficult and time-consuming.

**Target Users:** Software engineers, web developers, front-end developers, and back-end developers.

## 2. Goals & Scope

### Goals
- Make testing and integration with backend systems easier
- Build an efficient and lightweight application
- Let developers create and send requests quickly with minimal setup

### In Scope
- HTTP request builder (URL, methods, body, body type, params, headers)
- Ad-hoc / on-the-fly requests without creating a project or collection
- Request authentication (token, API key, username/password)
- Response viewer with prettified output, syntax highlighting, copy, and full-screen mode
- Environment variables (auth token, API key, username/password, base URL)
- User accounts (sign up / sign in), settings, and preferences
- Local-first storage with optional cloud sync
- Full offline usage
- Project → collection → API request organization

### Out of Scope
- Automated, scheduled, or CI-based API testing
- Load, stress, or performance testing
- Mock servers or API mocking
- GraphQL, WebSocket, or gRPC clients
- OpenAPI/Swagger import or API documentation generation
- Team collaboration or real-time multi-user editing
- Code or SDK generation
- Mobile applications

## 3. Functional Requirements
- **FR-01:** The user can create and send a request on the fly without creating a project or collection.
- **FR-02:** The user can enter an API URL and choose a request method (GET, POST, PUT, PATCH, DELETE).
- **FR-03:** The user can write a body payload.
- **FR-04:** The user can choose a request body type.
- **FR-05:** The user can add one or more request parameters.
- **FR-06:** The user can add one or more request headers.
- **FR-07:** The user can enable and use an auth section to include required API authentication methods.
- **FR-08:** The user can view the response with prettified output and syntax highlighting (HTML, JSON).
- **FR-09:** The user can copy the full response payload.
- **FR-10:** The user can open the response payload in a full-screen modal.
- **FR-11:** The user can add an environment variable for an auth token.
- **FR-12:** The user can add an environment variable for an auth API key.
- **FR-13:** The user can add an environment variable for auth username and password.
- **FR-14:** The user can add an environment variable for a base URL.
- **FR-14a:** The user can add a custom environment variable with a freeform key (letters, numbers, underscore; must start with a letter or `_`) for use as `{{key}}` placeholders.
- **FR-15:** The user can sign up or sign in to an account.
- **FR-16:** The user account is local-first and can sync to the cloud. Cloud sync uses Firebase Authentication and Cloud Firestore; it is optional; data in transit uses TLS; secret fields are client-encrypted before upload ([ADR-006](./adr/ADR-006-firebase-sync.md)).
- **FR-17:** The account stores the user’s personal information, including user settings and preferences.
- **FR-18:** The system can be used fully offline and operates as a local-first system.
- **FR-19:** Each user account can create one or more projects.
- **FR-20:** Each project can include one or more collections.
- **FR-21:** Each collection includes one or more API requests.

## 4. Non-Functional Requirements
- **NFR-01 — Performance:** The application must stay efficient and lightweight, with fast request/response handling and a responsive UI.
- **NFR-02 — Security:** Auth credentials and environment variables must be stored securely; cloud sync must protect user data in transit and at rest.
- **NFR-03 — Reliability:** Core features must work fully offline; local-first data must remain consistent, with safe cloud sync when available.
- **NFR-04 — Usability:** The UI must stay simple so users can build and send requests with minimal setup.
- **NFR-05 — Portability:** The application must run as a desktop app on major desktop platforms.

## 5. Acceptance Criteria

### Ad-hoc Request
- **AC-01:** Given the app is open with no project or collection selected, when the user builds and sends a request, then the request succeeds without requiring a project or collection.
- **AC-02:** Given an ad-hoc request was sent, when the user returns to the request builder, then they can edit and resend it without creating a project or collection.

### Request Builder
- **AC-03:** Given the request builder is open, when the user enters a URL and selects a method (GET, POST, PUT, PATCH, DELETE), then the selected URL and method are applied to the request.
- **AC-04:** Given a method that supports a body, when the user chooses a body type and enters a payload, then the body is included in the sent request.
- **AC-05:** Given the request builder is open, when the user adds one or more query parameters, then those parameters are included in the request URL.
- **AC-06:** Given the request builder is open, when the user adds one or more headers, then those headers are included in the sent request.

### Authentication
- **AC-07:** Given the auth section is disabled, when the user enables it and configures an auth method, then the request includes the configured authentication.

### Response Viewer
- **AC-08:** Given a response is received as JSON or HTML, when the response viewer opens, then the payload is prettified with syntax highlighting.
- **AC-09:** Given a response is displayed, when the user copies the response, then the full response payload is placed on the clipboard.
- **AC-10:** Given a response is displayed, when the user opens full-screen mode, then the response payload is shown in a full-screen modal.

### Environment Variables
- **AC-11:** Given the environment settings are open, when the user adds variables for auth token, API key, username/password, or base URL, then those values can be used in subsequent requests.
- **AC-11a:** Given the environment settings are open, when the user adds a custom variable with a unique valid key, then that value can be referenced as `{{key}}` in subsequent requests.
- **AC-12:** Given environment variables are set, when the user sends a request that references them, then the request uses the resolved variable values.

### Accounts & Preferences
- **AC-13:** Given the user has no session, when they sign up or sign in with valid credentials, then an authenticated account session is created.
- **AC-14:** Given the user is signed in, when they update settings or preferences, then those values are stored with the account and applied on next launch.

### Offline & Sync
- **AC-15:** Given the device has no network connection, when the user creates requests, projects, collections, or environment variables, then the app continues to work using local-first storage.
- **AC-16:** Given local changes exist and the network is available, when cloud sync runs, then local data syncs to the cloud without data loss.

### Projects, Collections & Requests
- **AC-17:** Given the user is signed in, when they create a project, then the project appears in their account.
- **AC-18:** Given a project exists, when the user creates a collection in that project, then the collection is listed under the project.
- **AC-19:** Given a collection exists, when the user saves an API request to it, then the request is listed under the collection and can be reopened and resent.

## 6. Constraints & Assumptions

**Constraints:**
- Desktop-only application (Tauri + React); no mobile or web-only version in this release
- HTTP REST methods only (GET, POST, PUT, PATCH, DELETE); no GraphQL, WebSocket, or gRPC
- Core workflows must work offline with local-first storage; cloud sync requires network access
- Auth support is limited to token, API key, and username/password
- Response prettifying and syntax highlighting cover JSON and HTML only
- The app must remain lightweight and efficient; heavy automation or load-testing features are excluded
- Project → collection → request organization is optional; ad-hoc requests must not require that structure

**Assumptions:**
- Users have basic knowledge of HTTP APIs (methods, headers, body, status codes)
- Target APIs are reachable over standard HTTP/HTTPS from the user’s machine
- Users primarily work on desktop platforms supported by Tauri
- Local disk storage is available and writable for local-first data
- Cloud sync is optional; users can complete core workflows without an account or network
- Environment variables cover common auth and base URL values, plus optional custom keys for other placeholders
- Most responses users care about are JSON or HTML
- A single-user account model is sufficient; team or shared workspaces are not required in this version

## 7. Success Metrics
- **Time to first request:** New user can send an ad-hoc request in under 30 seconds without creating a project or collection
- **Request success rate:** ≥ 95% of user-initiated requests complete and display a response or a clear error
- **App responsiveness:** Request builder and response viewer stay interactive; UI actions respond within 100ms under normal use
- **Offline reliability:** 100% of core workflows (build/send request, save locally, manage env vars) work with no network
- **Feature adoption:** ≥ 60% of active users send at least one request using env vars or saved collections within the first week
- **Install size / footprint:** Desktop app remains lightweight (target install size under 50MB for the packaged app where feasible)
