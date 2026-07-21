# Deployment and operations

Цей документ описує production-процедуру, але репозиторій у межах MVP не розгортається на сторонній платформі.

## Runtime assumptions

- Node.js 22.12+ або 24 LTS;
- PostgreSQL 17 із дозволом створити `pgcrypto`, `citext` і `pg_trgm` під час першої migration;
- TLS завершується на trusted reverse proxy;
- процес має постійний доступ до PostgreSQL та, для local audio driver, до окремого persistent volume;
- один canonical HTTPS origin заданий у `NEXT_PUBLIC_APP_URL` та `ALLOWED_ORIGINS`.

Odd-numbered Node releases не є production target. Застосунок збирається як Next.js standalone output.

## Release procedure

1. Створіть зашифрований backup PostgreSQL і перевірте доступ до audio objects.
2. Встановіть точний lockfile: `npm ci --omit=dev` у runtime image та повний `npm ci` у build job.
3. У build job виконайте `npm run db:generate`, `npm run lint`, `npm test` і `npm run build`.
4. Перед запуском нового application process виконайте `npm run db:migrate:deploy` рівно один раз для release.
5. Виконайте `npm run db:seed`; structural seed безпечний для повторного запуску.
6. Запустіть `node .next/standalone/server.js` із `HOSTNAME=0.0.0.0` та потрібним `PORT`.
7. Перевірте `/uk`, `/en`, `/api/v1/auth/session` і protected endpoint без cookie (очікується `401`).

Не запускайте `prisma migrate dev` або `prisma db push` у production.

## Required secrets and configuration

`DATABASE_URL` і `SESSION_PEPPER` мають надходити із secret manager. Pepper повинен бути випадковим і містити щонайменше 32 байти; його ротація інвалідовує чинні sessions. `ALLOWED_ORIGINS` не повинен містити wildcard. `ADMIN_EMAIL` не є постійною runtime-змінною: задавайте її лише на час ручного bootstrap.

Local audio driver підходить лише там, де process має persistent filesystem і резервне копіювання. Для кількох application replicas використовуйте S3-compatible adapter із private bucket, object-level access control та підписаною delivery layer; credentials до bucket не зберігаються в PostgreSQL.

## Database changes and rollback

Migrations є forward-only. Перед release перевіряйте їх на копії production schema. Якщо application rollback сумісний із уже застосованою additive migration, поверніть попередній artifact без зміни бази. Для несумісної migration відновлюйте перевірений backup у нову базу та перемикайте connection після перевірки; не редагуйте застосовані SQL-файли заднім числом.

```sh
pg_dump --format=custom --no-owner --file=tactlex.dump "$DATABASE_URL"
pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" tactlex.dump
```

Audio objects резервуються та відновлюються окремо; checksum у `audio_assets` дає змогу перевірити відповідність.

## Observability and maintenance

- збирайте structured server errors за `X-Request-Id`, але не body credentials, cookie або session token;
- стежте за 5xx, auth/rate-limit spikes, migration failures, PostgreSQL connections і volume capacity;
- перевіряйте expired sessions та one-time tokens окремою maintenance job перед масштабним production запуском;
- створюйте weekly leaderboard period на межі ISO-тижня до того, як він потрібен клієнтам;
- регулярно тестуйте restore на ізольованій базі.

Audit, review, answer, XP і revision ledgers є append-only на рівні PostgreSQL. Операційні cleanup scripts не повинні їх оновлювати або видаляти.
