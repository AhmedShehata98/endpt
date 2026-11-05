# ADR-009: Team collaboration on Firebase (Spark-compatible)

**Status:** Accepted (amended 2026-11-04)  
**Date:** 2026-11-04  
**Decides:** Team Collaboration backend approach  
**Requirements SoT:** [`docs/features/team-collaboration/`](../features/team-collaboration/) (not duplicated here)

## Context

Team Collaboration needs multi-user roles, invitations, and authorization. The desktop app is local-first (SQLite) with optional single-user Firestore sync ([ADR-006](./ADR-006-firebase-sync.md)).

Cloud Functions require the Firebase **Blaze** (pay-as-you-go) plan. Endpt targets the free **Spark** plan for team collaboration.

## Options

1. **PostgreSQL + custom API** — strongest invariants; new stack.
2. **Firestore + Cloud Functions** — strong server enforcement; **requires Blaze**.
3. **Client Firestore + shared policy + security rules** — works on **Spark**; rules are a coarse gate, fine-grained matrices run in the app.

## Decision

Use **Firebase Authentication** + **Cloud Firestore** on the **Spark** plan.

- **Personal data** stays local-first (ADR-006). Unchanged.
- **Team data** lives under `teams/{teamId}/**` and `users/{uid}/teamIndex/{teamId}`.
- **Mutations** use the client SDK via `FirestoreTeamRemote`, after `authorize()` / `canManageMember` in `modules/team`.
- **Security rules** require Auth and membership (`teamIndex`) for team paths; they do not re-implement the full role matrix.
- **Cloud Functions** under `functions/` remain in the repo as an **optional Blaze upgrade** path; they are not required to run or deploy teams.

## Consequences

- Deploy on Spark: `firebase deploy --only firestore:rules,firestore:indexes` (no Functions).
- Trust boundary: authenticated clients; rules prevent anonymous/cross-user personal-path abuse; role matrices are enforced in the desktop policy layer (same as Functions would).
- Team ops need network + Firebase sign-in (cloud link).
- Real-time multi-user editing remains out of scope.
