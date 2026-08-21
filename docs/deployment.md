# Безкоштовний production deployment

Початкове production-середовище TactLex: Vercel Hobby для Next.js та Neon Free для
PostgreSQL. Воно розраховане на особистий некомерційний beta-запуск у межах
безкоштовних лімітів платформ.

## 1. Neon

1. Створіть чистий Neon-проєкт у європейському регіоні.
2. Збережіть pooled connection string як `DATABASE_URL` у Vercel.
3. Збережіть direct connection string як захищений GitHub Environment secret
   `DIRECT_URL`; не додавайте його до Vercel runtime без потреби.
4. До першого deployment перевірте міграції на окремій Neon branch. Початкова
   migration має успішно створити `pgcrypto`, `citext` і `pg_trgm`.

CLI використовує `DIRECT_URL`, коли він заданий, а застосунок використовує pooled
`DATABASE_URL`. Production-міграції є forward-only; не запускайте `prisma migrate
dev` або `prisma db push` проти production.

## 2. Vercel

Створіть Vercel-проєкт із цього GitHub-репозиторію, але вимкніть автоматичні Git
deployments і preview deployments. Реліз виконує лише ручний workflow **Deploy
production** після повної перевірки.

Production environment variables у Vercel:

```text
DATABASE_URL=<Neon pooled connection string>
SESSION_PEPPER=<random secret of at least 32 bytes>
NEXT_PUBLIC_APP_URL=https://<project>.vercel.app
ALLOWED_ORIGINS=https://<project>.vercel.app
AUDIO_UPLOADS_ENABLED=false
```

GitHub Environment `production` має містити secrets:

```text
DIRECT_URL=<Neon direct connection string>
VERCEL_TOKEN=<Vercel deployment token>
VERCEL_ORG_ID=<Vercel account/team id>
VERCEL_PROJECT_ID=<Vercel project id>
```

`Deploy production` перевіряє проєкт на тимчасовому PostgreSQL, застосовує
production migrations один раз, виконує structural seed, збирає Vercel artifact,
публікує його і перевіряє `/api/health`.

## 3. Перший адміністратор і beta-контент

1. Після першого порожнього deployment зареєструйте звичайний активний профіль.
2. Запустіть workflow **Bootstrap production content**, передайте email цього
   профілю й увімкніть підтвердження unreviewed beta.
3. Workflow надасть роль адміністратора, перевірить пакет, імпортує 300 термінів і
   опублікує їх та 30 уроків із явним audit-записом unreviewed beta.

Email не зберігається як постійний secret. Workflow не створює фальшивого
рецензента та не переносить локальні профілі або навчальний прогрес.

## 4. Аудіо, перевірка і rollback

У Vercel `AUDIO_UPLOADS_ENABLED=false`: нові аудіофайли не записуються на
ефемерну файлову систему, а навчання використовує позначений Web Speech TTS
fallback. Статичні WebP-аватари доставляються разом із застосунком.

Після релізу перевірте реєстрацію, повторний вхід, 300 термінів, 30 уроків,
двомовний пошук, змішаний урок, AAR, усі аватари, рейтинг і мобільний інтерфейс.
`GET /api/health` має повертати `200 {"status":"ok"}` без кешування.

При невдалому application release поверніть попередній Vercel deployment. Перед
змінами схеми створюйте Neon branch або `pg_dump` через direct URL. Не редагуйте
застосовані migration-файли й не робіть руйнівний rollback; виправляйте схему
новою forward-only migration або відновлюйте перевірену копію бази.
