# ADR-007: Broad HTTP capability scopes for the API client

**Status:** Accepted  
**Date:** 2026-10-31  
**Related:** [ADR-005](./ADR-005-local-persistence.md), Phase 2 Tauri HTTP adapter, Phase 9 security pass

## Context

Endpt is a general-purpose HTTP API client. Users enter arbitrary `http://` and `https://` URLs. Production sends go through `tauri-plugin-http` (`TauriHttpClient`), which requires capability allow-lists in [`src-tauri/capabilities/default.json`](../../src-tauri/capabilities/default.json).

## Decision

Keep broad URL scopes for the HTTP plugin:

- `http://*` / `https://*` (with path and port variants)

Narrowing to a fixed host list would break the product. CORS is intentionally bypassed by the native adapter; the webview Fetch path is only for tests / non-desktop runs.

## Security notes (NFR-02)

- Env values and auth fields are encrypted at rest (key in OS keychain).
- Sync sends ciphertext for secrets; Session, AdHocRequest, and ResponseView never sync.
- Application logs must record method, host, timing, and error category only — never tokens, passwords, or env values.
- Firestore rules restrict each user to `/users/{uid}/**`.

## Ops (live Firebase)

1. Enable Email/Password in Firebase Authentication.
2. Deploy rules: `firebase deploy --only firestore:rules`.
3. Set `VITE_FIREBASE_*` in `.env` (see `.env.example`) and restart the app.
