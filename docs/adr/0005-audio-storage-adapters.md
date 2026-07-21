# ADR 0005: Audio metadata in PostgreSQL, bytes behind adapters

- Status: accepted
- Date: 2026-07-21

## Decision

Keep audio metadata and ownership in PostgreSQL; store bytes outside the database. Ship local and seed-file adapters and define the boundary for a later S3-compatible adapter. Use Web Speech API only as a visibly synthetic fallback.

## Why

Relational metadata remains searchable and auditable while large blobs do not burden backups or Prisma queries. The adapter preserves portability between local development and durable object storage.

## Consequences

Production operators must provide durable storage and back it up independently. TTS availability and voice quality depend on the browser.
