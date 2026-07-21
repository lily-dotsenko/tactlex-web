# ADR 0001: API-first modular monolith

- Status: accepted
- Date: 2026-07-21

## Decision

Use one Next.js App Router deployment with versioned `/api/v1` route handlers. HTTP adapters call feature-oriented server services and policies; services use Prisma repositories. React components do not own domain decisions.

## Why

This is the smallest deployable architecture that still gives a future mobile client a stable API and keeps correctness, XP, scheduling and authorization out of the browser. Separate services would add operational cost before traffic or team boundaries justify them.

## Consequences

Feature modules need explicit boundaries and route tests. Service functions receive a trusted principal rather than reading cookies directly. A later mobile/bearer auth adapter can reuse the same policies and services.
