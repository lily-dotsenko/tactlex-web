# ADR 0002: Opaque server sessions and same-origin mutations

- Status: accepted
- Date: 2026-07-21

## Decision

Use high-entropy opaque session cookies. Store only token digests in PostgreSQL. Protect cookie-authenticated mutations with SameSite cookies, strict Origin/Host validation, content-type enforcement and server authorization.

## Why

Sessions can be revoked immediately, no claims become stale, and sensitive identity/roles remain server-controlled. Origin validation is simpler for a same-origin first-party web client than synchronizer-token plumbing while providing explicit CSRF defense.

## Consequences

The initial public API auth is cookie-based. Domain services remain transport-neutral so a future mobile token adapter can be added. Cross-origin browser clients are not enabled by default.
