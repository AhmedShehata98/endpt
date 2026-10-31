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

## Build

```bash
pnpm tauri build
```

## Lint, format, and test

```bash
pnpm lint
pnpm format
pnpm test
```

Local data uses SQLite (`sqlite:endpt.db`) inside the Tauri app (Linux: `~/.config/com.ahmed-shehata.endpt/`). Env values and auth secrets are encrypted at rest; the master key lives in the OS keychain.

Do not edit an already-applied SQL migration file. Add a new numbered migration under `src-tauri/migrations/` and register it in `src-tauri/src/lib.rs`. Editing migration 1 after first launch causes: `migration 1 was previously applied but has been modified` — fix by deleting the local `endpt.db` (dev only) or shipping a new migration.

## Stack

- Desktop shell: Tauri 2
- UI: React 19 + TypeScript (strict) + Vite + Tailwind CSS 4
- Modules under `modules/` (request, response, environment, account, project, sync, persistence)
