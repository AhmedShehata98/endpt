# ADR-010: Team policy module (focused authorize layer)

**Status:** Accepted  
**Date:** 2026-11-04  
**Related:** [ADR-004](../ARCHITECTURE.md) (no Domain Layer for MVP), [ADR-009](./ADR-009-team-collaboration-firebase.md)

## Context

MVP omitted a Domain Layer because rules were mostly validation and orchestration (ADR-004). Team Collaboration introduces role matrices, effective permission order, and membership ceilings that must not be reimplemented ad hoc in UI handlers or Cloud Function entrypoints.

## Decision

Add a focused **policy module** under `modules/team/application/policy/`:

- Pure TypeScript: permission maps, `authorize()`, `canManageMember()`.
- Table-driven tests generated from Team Business Rules §§3–7.
- No full Clean Architecture Domain Layer; Application services and Functions call this policy only.

## Consequences

- ADR-004 still applies to personal/MVP paths.
- Team handlers declare a permission key; enforcement is centralized.
- Policy is the single source for role-name-free checks (Business Rules §13).
