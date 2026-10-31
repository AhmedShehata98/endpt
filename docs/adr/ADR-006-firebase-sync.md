# ADR-006: Firebase Auth + Firestore for cloud sync

**Status:** Accepted  
**Date:** 2026-10-31  
**Decides:** Implementation Plan §9 open decision 1 / Phase 8

## Context

Endpt is local-first (SQLite). Optional cloud sync must never block offline use (FR-16, FR-18, AC-15, AC-16, NFR-03). No prior document named a sync backend. Local accounts use Argon2; cloud identity must link without replacing local-first auth.

## Options

1. **Firebase** — Auth (email/password) + Cloud Firestore, JS SDK in the Tauri webview.
2. **Custom hosted API** — full control, more build and ops cost.
3. **Engine + fake only** — defer real cloud past MVP.

## Decision

Use **Firebase Authentication (email/password)** and **Cloud Firestore** as the remote sync backend.

- SQLite remains the offline source of truth; Firestore is remote only (do not treat Firestore offline cache as primary store).
- On first sync, link the local account with the same email+password via Firebase `createUser` / `signIn`; persist `cloudUserId` and `Session.accessToken`.
- Application depends on a `SyncRemote` port; Infrastructure provides `FirebaseSyncRemote` and `FakeSyncRemote` (tests).
- Secret fields are encrypted client-side with a password-derived sync key before upload (NFR-02); `passwordHash` never syncs.
- Firestore layout: `users/{cloudUserId}/{collection}/{id}` with rules scoped to the authenticated uid.

## Consequences

- Requires a Firebase project and Vite `VITE_FIREBASE_*` config; missing config keeps sync disabled with a clear status message.
- Conflict rule stays last-write-wins by `updatedAt` (single-user; no team edit).
- Soft-delete tombstones sync, then purge after both sides acknowledge.
