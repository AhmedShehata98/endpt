# Endpt

Lightweight desktop API client (Tauri 2 + React + TypeScript + Vite).

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/tools/install) (for Tauri)

## Develop

```bash
pnpm install
pnpm tauri dev
```

Frontend-only (Vite, no native shell):

```bash
pnpm dev
```

## Build / release

```bash
pnpm tauri build
```

Produces platform installers under the Cargo `target/release/bundle/` directory (on this Linux host: `.deb`, `.rpm`, and `.AppImage`). Run the same command on macOS or Windows for those targets. Prefer `.deb` / `.rpm` when package size matters (see [docs/PERF_NOTES.md](docs/PERF_NOTES.md)).

## Lint, format, and test

```bash
pnpm lint
pnpm format
pnpm test
pnpm test:e2e
```

E2E uses Playwright against Vite with `VITE_E2E=1` (in-memory repos + `FakeSyncRemote`; HTTP mocked via `page.route`). Install the browser once: `pnpm exec playwright install chromium`.

## Local data and secrets

Local data uses SQLite (`sqlite:endpt.db`) inside the Tauri app (Linux: `~/.config/com.ahmed-shehata.endpt/`). Env values and auth secrets are encrypted at rest; the master key lives in the OS keychain.

Do not edit an already-applied SQL migration file. Add a new numbered migration under `src-tauri/migrations/` and register it in `src-tauri/src/lib.rs`. Editing migration 1 after first launch causes: `migration 1 was previously applied but has been modified` — fix by deleting the local `endpt.db` (dev only) or shipping a new migration.

## Cloud sync (optional)

Sync uses Firebase Auth + Firestore ([ADR-006](docs/adr/ADR-006-firebase-sync.md)). Copy `.env.example` to `.env` and set `VITE_FIREBASE_*`. Then:

1. Enable **Email/Password** in Firebase Authentication.
2. Deploy rules: `firebase deploy --only firestore:rules`.
3. Restart the app after changing `.env`.

Without Firebase config, the app stays local-only with a clear sync error. HTTP capability scopes for arbitrary APIs are documented in [ADR-007](docs/adr/ADR-007-http-capability-scope.md).

## Team collaboration (optional)

Teams use Firebase Auth + **client Firestore** on the free Spark plan ([ADR-009](docs/adr/ADR-009-team-collaboration-firebase.md)). No Blaze upgrade and no Cloud Functions deploy required. Personal SQLite sync is unchanged.

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

Cloud-link the account (Settings → sync) so Firebase Auth is signed in before using Teams. Without Firebase config, the Teams UI uses an in-memory fake remote.

Optional later (Blaze only): `functions/` callables remain in the repo but are not part of the default deploy.

## Stack

- Desktop shell: Tauri 2
- UI: React 19 + TypeScript (strict) + Vite + Tailwind CSS 4
- Modules under `modules/` (request, response, environment, account, project, sync, team, persistence)

## Docs

- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Performance notes](docs/PERF_NOTES.md)
- [PRD](docs/PRD.md) · [Architecture](docs/ARCHITECTURE.md) · [Data model](docs/DATA_MODEL.md) · [UI/UX](docs/UI_UX_SPEC.md)
- [Team feature docs](docs/features/team-collaboration/)
