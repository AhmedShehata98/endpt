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

Local data uses SQLite (`sqlite:endpt.db`) inside the Tauri app. Env values and auth secrets are encrypted at rest; the master key lives in the OS keychain.

## Stack

- Desktop shell: Tauri 2
- UI: React 19 + TypeScript (strict) + Vite + Tailwind CSS 4
- Modules under `modules/` (request, response, environment, account, project, sync, persistence)
