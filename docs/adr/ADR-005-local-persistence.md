# ADR-005: Local persistence with SQLite

**Status:** Accepted  
**Date:** 2026-10-31  
**Decides:** Implementation Plan §4.2 / ARCHITECTURE §17 question 2

## Context

Endpt needs offline-first storage for projects, collections, saved requests, environment variables, settings, sessions, and the ad-hoc draft. Sync later needs `updatedAt` / `deletedAt` queries. Secrets must not sit as plaintext next to the database (NFR-02).

## Options

1. **SQLite** via `@tauri-apps/plugin-sql` — relational schema, soft deletes, indexed uniqueness, migrations.
2. **Tauri store** (key-value JSON) — simple, weak for hierarchy and sync scans.

## Decision

Use **SQLite** (`sqlite:endpt.db`) with schema migrations registered in the Tauri SQL plugin.

## Consequences

- Repository ports live in owning modules; adapters live in `modules/persistence`.
- Field-level encryption (AES-256-GCM) for env values and auth secret fields; master key in the OS keychain via Rust commands.
- In-memory repository fakes remain for unit tests and non-Tauri Vite sessions.
- Spike confirmed: plugin loads DB, runs migration `001_init`, frontend can execute/select.
