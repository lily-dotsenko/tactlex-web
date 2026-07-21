# Test strategy

## Layers

- **Unit:** normalization, answer matching, content transitions, scheduling, XP/level rules, streak dates, achievement predicates and authorization policies.
- **Service/API integration:** real PostgreSQL, Prisma repositories, transactions, constraints, session lifecycle, RBAC, workflow, idempotency and leaderboards.
- **Migration/seed:** apply migrations to a clean database, inspect required extensions/indexes/triggers, run seed twice and compare stable counts.
- **Browser E2E:** Playwright covers critical Ukrainian/English user and admin journeys at desktop and 360 px mobile viewport.
- **Accessibility/security:** semantic roles, keyboard/focus behavior, no protected data in public responses, USER 403 on admin endpoints and origin checks on mutations.

## Required scenarios

1. registration rejects duplicate/invalid input and stores Argon2id hash;
2. login creates session, logout revokes it;
3. USER cannot call admin API or render admin data;
4. ADMIN creates a draft term;
5. content moves through review without skipped transitions;
6. incomplete/unverified content cannot publish;
7. user starts and completes an 8–12-term lesson;
8. server accepts primary/approved synonyms and rejects a different term;
9. progress is persisted;
10. each review grade creates deterministic state and immutable log;
11. XP ledger is idempotent and cannot be set by the client;
12. achievement is awarded once;
13. weekly and all-time leaderboards rank opted-in nicknames only;
14. locale switch keeps an equivalent route;
15. audio player distinguishes human audio from TTS fallback;
16. user reports an incorrect term and admin resolves it.

## Commands and environments

`npm test` runs isolated unit tests. `npm run test:integration` requires `TEST_DATABASE_URL` pointing at a disposable PostgreSQL database. `npm run test:e2e` requires the application and database; Playwright webServer starts the app where supported.

Integration tests may reset only a database whose name ends in `_test`; otherwise the test bootstrap refuses to run.

## Final verification order

1. `npm run format:check`
2. `npm run lint`
3. `npm test`
4. `npm run db:validate`
5. clean `npm run db:migrate:deploy`
6. `npm run db:seed` twice
7. `npm run test:integration`
8. `npm run build`
9. `npm run test:e2e`

If Docker, PostgreSQL or the Playwright browser is unavailable, the exact command and reason are recorded. Unrun checks are never reported as passing.

## MVP verification snapshot

Локально на 21 липня 2026 року пройдено: Prettier, ESLint без warnings, Prisma schema validation, 83 unit/UI tests, production build на 80 маршрутах і 5 Chromium E2E tests. Два integration-файли (5 сценаріїв) локально пропускаються без `TEST_DATABASE_URL`. GitHub Actions run `29866985179` успішно виконав їх після clean migration та подвійного seed у PostgreSQL 17, а потім повторив build і Chromium E2E у Linux CI.
