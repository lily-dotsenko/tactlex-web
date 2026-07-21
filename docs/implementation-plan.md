# План реалізації

Оновлено: 21 липня 2026 року.

## Передумови

- Робоча папка перевірена: `C:\Users\Igor\Desktop\tactlex-web`.
- Репозиторій був порожнім, тому використовується `main`.
- `origin` встановлений на `https://github.com/lily-dotsenko/tactlex-web.git`; remote перевірено, гілок немає.
- Наявних користувацьких файлів або незакомічених змін до старту не було.
- Зовнішнє розгортання не виконується: публікація означає commit і push у GitHub.

## Послідовність і залежності

| Етап | Результат | Залежить від | Статус |
| --- | --- | --- | --- |
| 1. Аудит і дизайн | Вимоги, архітектура, ERD, API, security, content, tests, ADR | — | Завершено |
| 2. Foundation | Next.js JavaScript, Tailwind, next-intl, PWA, tooling, Compose | 1 | У роботі |
| 3. Database | Prisma schema, SQL migration, constraints, indexes, seed | 2 | Заплановано |
| 4. Auth і RBAC | Argon2id, opaque sessions, CSRF, policies, bootstrap admin | 3 | Заплановано |
| 5. Content admin | Terms, sources, review transitions, CSV, audio metadata | 3–4 | Заплановано |
| 6. Public content | Categories, glossary, search, term detail, reports | 5 | Заплановано |
| 7. Learning | Lessons, sessions, answer validation, AAR | 4–6 | Заплановано |
| 8. Reviews і progress | FSRS-compatible scheduler, due queue, logs | 7 | Заплановано |
| 9. Gamification | XP, activity, streaks, achievements, leaderboards | 7–8 | Заплановано |
| 10. Audio і UI | Adapters, TTS fallback, responsive bilingual screens | 4–9 | Заплановано |
| 11. QA і hardening | Unit, API, integration, E2E, clean-DB rehearsal | 2–10 | Заплановано |
| 12. Documentation і publish | README, guides, changelog, commits, push verification | 11 | Заплановано |

## Прийняті правила

- Runtime target: Active LTS Node.js; `engines` не схвалює odd-numbered production Node releases.
- App Router pages мають locale prefix; `/` перенаправляє на `/uk`.
- PostgreSQL зберігає authoritative state. Browser storage використовується лише для несуттєвих UI preferences, якщо буде потрібний.
- Auth session — випадковий opaque token у `httpOnly`, `sameSite=lax`, `secure` у production cookie; база зберігає лише SHA-256 digest.
- CSRF для mutations: перевірка same-origin `Origin`/`Host` разом із `SameSite` cookie. JSON API відхиляє не-JSON mutations; multipart upload використовує same-origin check.
- Rate limiting для MVP зберігається у PostgreSQL і має окремі buckets для auth та відповідей.
- Тиждень рейтингу — ISO Monday–Sunday, календарні streak межі рахуються в `Europe/Kyiv`, timestamps зберігаються в UTC.
- Денна ціль за замовчуванням — 20 XP. XP rules задані в одному server module.
- Leaderboard opt-in: `leaderboardVisible` вимкнено за замовчуванням; email ніколи не повертається в ranking response.
- Service worker не кешує `/api/*`, authenticated HTML або mutation requests.

## Маршрути

UI:

- `/[locale]`, `/[locale]/register`, `/[locale]/login`, `/[locale]/onboarding`;
- `/[locale]/dashboard`, `/learn`, `/categories`, `/categories/[slug]`;
- `/[locale]/lessons/[lessonId]`, `/study/[sessionId]`, `/study/[sessionId]/result`;
- `/[locale]/reviews`, `/glossary`, `/glossary/[termId]`;
- `/[locale]/progress`, `/achievements`, `/leaderboard`, `/profile`, `/settings`;
- `/[locale]/admin`, `/admin/terms`, `/admin/reviews`, `/admin/categories`, `/admin/lessons`, `/admin/users`, `/admin/achievements`, `/admin/reports`, `/admin/audit-log`.

API groups: `/api/v1/auth/*`, `profile`, `categories`, `terms`, `lessons`, `study-sessions`, `reviews`, `progress`, `achievements`, `leaderboards`, `reports`, `admin/*`.

## Перевірки за етапами

- Foundation: format, lint, unit smoke, production build.
- Database: `prisma validate`, generate, clean `migrate deploy`, idempotent seed twice, constraints/index inspection.
- Auth/content/learning: unit + API/service integration + RBAC tests.
- UI: Playwright uk/en, keyboard navigation, mobile viewport, auth/lesson/admin critical paths.
- Final: secrets scan, format check, lint, all unit/integration/API tests, migration/seed rehearsal, build, Playwright where browser runtime is available.

## Запланована історія Git

Коміти створюються за реальними стабільними частинами, орієнтовно:

1. `docs: define the TactLex MVP architecture`
2. `chore: establish the web application foundation`
3. `feat: add the PostgreSQL domain model`
4. `feat: secure accounts and role checks`
5. `feat: add the reviewed content workflow`
6. `feat: deliver lessons and scheduled reviews`
7. `feat: track progress and learning rewards`
8. `feat: complete the bilingual learning interface`
9. `test: cover critical user and admin journeys`
10. `docs: finish setup and operations guidance`

Назви коригуються відповідно до фактичного diff. Перед кожним стабільним push виконуються релевантні перевірки. Force push, зміна author/email та переписування історії заборонені.

## Gate готовності

Етап не позначається завершеним, якщо реалізація не пройшла відповідну перевірку. Зовнішня залежність, якої немає в середовищі (наприклад Docker daemon або browser binary), фіксується окремо; така перевірка не видається за успішну.
