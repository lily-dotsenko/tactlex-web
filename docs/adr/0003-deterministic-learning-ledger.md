# ADR 0003: Deterministic scheduling and immutable reward ledgers

- Status: accepted
- Date: 2026-07-21

## Decision

Implement a documented FSRS-compatible deterministic scheduler on the server. Store previous/new scheduling snapshots in append-only review logs. Store XP as immutable transactions with unique source keys; derive totals, levels and leaderboards from the ledger.

## Why

Determinism makes the behavior testable. Transition logs explain future due dates. Source-key uniqueness prevents duplicate XP and achievement awards during retries.

## Consequences

Parameter changes require versioning and migration consideration. Lesson completion combines progress, review state, XP, activity and achievement awards in one database transaction.
