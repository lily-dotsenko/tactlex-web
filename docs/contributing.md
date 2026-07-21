# Contributing

## Before changing code

1. Прочитайте product requirements і релевантний ADR.
2. Перевірте `git status`; не видаляйте чужі незакомічені зміни.
3. Для зміни схеми створіть нову migration. Не редагуйте migration, що вже застосовувалася спільним середовищем.
4. Тримайте React UI відокремленим від правил правильності, XP, scheduling та authorization.

Прикладний код пишеться JavaScript у `.js`/`.jsx`. Додавайте JSDoc лише коли контракт неочевидний із назви та Zod schema.

## Content changes

- Не вигадуйте переклади і не вставляйте неперевірений запис як `APPROVED` або `PUBLISHED`.
- AI-assisted та imported rows завжди починають у `DRAFT` і зберігають відповідний `origin`.
- Публікація вимагає primary EN/UK variants, обох коротких definitions, category, verified source з exact URL/date/reviewer і approval поточної revision.
- Не додавайте секретні, чутливі чи оперативні інструкції. TCCC definitions не замінюють сертифіковане навчання.
- Не копіюйте значні уривки джерел. Пишіть короткий власний опис і посилайтеся на точну публічну сторінку.

Детальні правила: [content-guidelines.md](./content-guidelines.md).

## API and database rules

- Новий mobile-facing contract додавайте під `/api/v1` і документуйте в OpenAPI.
- Mutation body проходить strict Zod validation; cookie-auth mutation також перевіряє same origin.
- Protected endpoint перевіряє principal/permission на backend. UI visibility не є authorization.
- Client не передає authoritative `isCorrect`, XP, streak, achievement або leaderboard rank.
- Answer/review/completion mutations мають idempotency key і transaction boundary.
- Основні зв'язки залишаються relational; JSONB використовується для snapshots/metadata.
- Новий query повинен мати обґрунтований index або пояснення, чому він не потрібен.

## Verification

Перед commit виконайте релевантний піднабір, а перед push — повний локально доступний набір:

```sh
npm run format:check
npm run lint
npm test
npm run db:validate
npm run test:integration
npm run build
npm run test:e2e -- --project=chromium
```

Integration tests можуть працювати лише з базою, назва якої закінчується на `_test`. Якщо зовнішня залежність недоступна, зафіксуйте конкретну непройдену команду; не описуйте її як успішну.

## Commit scope

Коміт має містити одну логічну зміну разом із її тестами й документацією. Не комітьте `.env`, uploads, database dumps, `.next`, coverage, Playwright report або test results. Не змінюйте Git author/email і не переписуйте shared history.

Для code review додайте коротко: поведінку, ризики, migration impact, виконані команди та відомі обмеження.
