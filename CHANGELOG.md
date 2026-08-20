# Changelog

Значущі зміни цього проєкту документуються тут. Формат базується на Keep a Changelog; версії до першого production release мають статус pre-release.

## [Unreleased]

### Added

- Product requirements, architecture, database, security, testing, content and API documentation with five ADRs.
- Next.js JavaScript application with responsive Ukrainian/English routes, accessible theme system and PWA metadata/service worker.
- Normalized PostgreSQL/Prisma domain model, controlled SQL migration, structural seed and Docker Compose development database.
- Argon2id authentication, opaque server sessions, same-origin mutation checks, PostgreSQL rate limiting and extensible RBAC.
- Reviewed term/category/lesson workflows, source provenance, draft import model, reports and immutable audit/revision events.
- API-first catalog, study/review, progress, achievements and privacy-filtered leaderboard surfaces.
- Deterministic server answer normalization, FSRS-compatible scheduler, XP/streak rules and audio storage adapters with disclosed TTS fallback.
- Vitest unit/integration suites, migration checks, Playwright browser tests and PostgreSQL-backed GitHub Actions verification.
- Windows development commands that provision and control an isolated, repository-local PostgreSQL instance when Docker is unavailable.

### Fixed

- PWA hydration while the browser is offline and stale service-worker caches during local development.
- Next.js development startup races for localized routes by avoiding static locale generation in development.
- Local integration tests now reliably select the disposable `TEST_DATABASE_URL` before Prisma is loaded.
- Local tooling no longer scans generated PostgreSQL binaries, data or PowerShell scripts.

[Unreleased]: https://github.com/lily-dotsenko/tactlex-web/commits/main
