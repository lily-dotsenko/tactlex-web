# API v1

Base path: `/api/v1`. JSON is UTF-8. Timestamps are ISO 8601 UTC. UUIDs are opaque strings. Authenticated web requests use the server session cookie; the domain service API is transport-neutral for a future mobile auth adapter.

## Conventions

Successful collection:

```json
{
  "data": [],
  "page": { "cursor": null, "nextCursor": null, "limit": 20 }
}
```

Error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Перевірте введені дані.",
    "fieldErrors": {},
    "requestId": "..."
  }
}
```

Mutations require a same-origin request. Replay-sensitive routes require `Idempotency-Key`. Unknown fields are rejected for security-sensitive bodies.

## Authentication

| Method | Route            | Auth     | Purpose                                     |
| ------ | ---------------- | -------- | ------------------------------------------- |
| POST   | `/auth/register` | public   | Create USER account and session             |
| POST   | `/auth/login`    | public   | Verify Argon2id password and create session |
| POST   | `/auth/logout`   | user     | Revoke current session                      |
| GET    | `/auth/session`  | optional | Return safe principal/permissions or null   |

Register body: `email`, `password`, `nickname`, `locale?`. Login body: `email`, `password`. Responses never include password hashes, session tokens, email verification tokens or role assignment internals.

## Profile

| Method | Route      | Purpose                                                                              |
| ------ | ---------- | ------------------------------------------------------------------------------------ |
| GET    | `/profile` | Current private profile and preferences                                              |
| PATCH  | `/profile` | Update nickname, locale, timezone, audience type, daily goal, leaderboard visibility |

## Published catalog

| Method | Route                                        | Purpose                                                                             |
| ------ | -------------------------------------------- | ----------------------------------------------------------------------------------- |
| GET    | `/categories`                                | Active categories with published/progress counts                                    |
| GET    | `/categories/{slug}`                         | Category detail and available lessons                                               |
| GET    | `/terms?q=&category=&locale=&cursor=&limit=` | Published glossary search                                                           |
| GET    | `/terms/{id}`                                | Published bilingual detail, category meanings, distractors, sources and audio state |
| GET    | `/lessons?category=`                         | Available lessons                                                                   |
| GET    | `/lessons/{id}`                              | Lesson overview without answer keys                                                 |
| GET    | `/audio/{id}`                                | Stream a non-archived human audio asset for published content                       |

Glossary pagination is cursor-based and capped. Search uses normalized variants and PostgreSQL trigram matching only for retrieval, not answer correctness.

## Study sessions

| Method | Route | Purpose |
| --- | --- |
| POST | `/study-sessions` | Create session from `lessonId`/`categoryId` and product direction |
| GET | `/study-sessions/{id}` | Resume own active session; returns `currentItem` and grouped `currentInteraction` without answer keys |
| POST | `/study-sessions/{id}/answers` | Submit any active `sessionItemId` (including a matching-group item), answer, optional rating/timing and idempotency key |
| POST | `/study-sessions/{id}/complete` | Finalize once and return AAR/rewards |

Answer response reveals correctness, accepted primary answer, short feedback and the server-awarded session delta only after evaluation. Completion derives total XP; request body cannot set XP.

Matching interactions contain four independent session items. Each item is evaluated and scheduled independently. Items expose `answerLocale`; for a contextual sentence it may match `promptLocale` because the blank is filled in place. Completion summaries expose `isFirstNodeCompletion`, `isPerfect` and `celebrationTier`; clients must suppress celebration for replayed or recovered completion responses.

## Scheduled reviews and progress

| Method | Route | Purpose |
| --- | --- |
| GET | `/reviews?limit=` | Due queue for current user |
| POST | `/reviews/{termId}` | Submit `Again|Hard|Good|Easy` with idempotency key |
| GET | `/progress` | Summary, streak, level and category progress |
| GET | `/achievements` | Catalog and current user's earned state |
| GET | `/leaderboards?period=weekly|all-time&limit=` | Opted-in nickname ranking |

## Reports

| Method | Route | Purpose |
| --- | --- |
| POST | `/reports` | Report a published term issue |
| GET | `/reports` | List current user's reports |

## Admin

All routes require an explicit permission and return 403 to an authenticated USER.

| Method           | Route                          | Purpose                                               |
| ---------------- | ------------------------------ | ----------------------------------------------------- |
| GET/POST         | `/admin/terms`                 | Paginated work queue / create DRAFT                   |
| GET/PATCH        | `/admin/terms/{id}`            | Full editor data / create immutable revision snapshot |
| POST             | `/admin/terms/{id}/transition` | Guarded next status with note                         |
| POST             | `/admin/terms/{id}/audio`      | Store validated human audio through adapter           |
| GET/DELETE       | `/admin/audio/{id}`            | Preview or archive an audio asset                     |
| POST             | `/admin/imports/preview`       | Validate bounded CSV/JSON and return checksum/errors  |
| POST             | `/admin/imports/commit`        | Import an unchanged preview as DRAFT rows             |
| GET/POST         | `/admin/categories`            | List/create categories                                |
| GET/PATCH/DELETE | `/admin/categories/{id}`       | Read/edit/soft-archive category                       |
| PATCH            | `/admin/categories/reorder`    | Reorder a bounded unique category set                 |
| GET/POST         | `/admin/lessons`               | List/create lessons                                   |
| PATCH            | `/admin/lessons/{id}`          | Edit composition and state                            |
| POST             | `/admin/lessons/{id}/status`   | Publish/archive with the 6–12 invariant               |
| GET              | `/admin/reviews`               | Content review queue                                  |
| POST             | `/admin/reviews/{id}/decision` | Approve/request changes/reject current revision       |
| GET              | `/admin/users`                 | Paginated safe user administration list               |
| GET/PATCH        | `/admin/users/{id}`            | Safe user summary / allowed role or status change     |
| GET              | `/admin/reports`               | Paginated report moderation queue                     |
| PATCH            | `/admin/reports/{id}`          | Review/resolve/dismiss a report                       |
| GET              | `/admin/audit`                 | Cursor-paginated immutable audit events               |
| GET/POST         | `/admin/achievements`          | List/create rule-backed achievements                  |
| GET/PATCH        | `/admin/achievements/{id}`     | Read/update achievement and rules                     |

## Status codes

- `200/201/204`: success;
- `400`: malformed JSON/query;
- `401`: no valid session;
- `403`: insufficient permission or origin rejection;
- `404`: unavailable resource (including another user's private resource);
- `409`: duplicate, invalid state transition or replay conflict;
- `413`: import/upload too large;
- `422`: valid JSON with domain validation errors;
- `429`: rate limited.

The executable OpenAPI document is stored at `docs/openapi.yaml` and must remain aligned with route tests.
