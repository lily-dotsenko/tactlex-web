# Security model

## Trust boundaries

The browser is untrusted. Role, correctness, XP, streak, scheduling, achievements and publication eligibility are derived on the server. PostgreSQL constraints provide the last guard against replay and duplicate awards.

## Authentication

- Registration accepts a normalized email and a password meeting the documented minimum policy.
- Passwords are hashed with Argon2id using the library's current secure parameters; only the encoded hash is stored.
- Login creates 256-bit random opaque token. The browser receives it in a cookie; the database stores only a SHA-256 digest.
- Cookie attributes: `httpOnly`, `sameSite=lax`, path `/`, bounded `maxAge`, and `secure` outside local development.
- Sessions expire absolutely, may be revoked individually, and are revoked on password/account security events.
- Logout revokes the server row before clearing the cookie.
- Authentication code logs neither supplied credentials nor token/cookie values.

## Authorization and RBAC

`USER` and `ADMIN` are data-backed roles composed from permissions. Policies run for every protected API route and privileged server-rendered page. Client navigation is only a convenience and never an authorization boundary. Resource ownership is checked in addition to permission where applicable.

The normalized role/permission model permits later `EDITOR`, `REVIEWER` and `MODERATOR` roles without schema changes.

## CSRF and request origin

State-changing cookie-authenticated requests must:

1. use POST, PATCH or DELETE;
2. send JSON (or validated multipart for audio/CSV);
3. have `Origin` matching the request host, with a documented local-development fallback to `Referer`;
4. carry a valid same-site session cookie.

`SameSite=Lax` is defense in depth, not the sole CSRF control. CORS is not opened broadly.

## Validation and abuse controls

- Zod validates params, query, body and imported CSV rows with size/count limits.
- Auth endpoints and answer/report submissions use independent rate-limit buckets keyed by a privacy-preserving combination of IP digest and actor.
- Answer submission has a unique idempotency key and a monotonically checked session ordinal.
- XP transactions have a unique `(user, sourceType, sourceId)` source key.
- Uploads enforce extension-independent MIME allowlists, size limits, generated filenames and storage outside executable/public source paths.
- Search and pagination have bounded lengths and page sizes.

The in-database rate limiter is sufficient for a single PostgreSQL-backed deployment. A distributed gateway limiter may replace the adapter without changing route handlers.

## Security headers

The application sets a restrictive Content Security Policy compatible with self-hosted scripts/styles, `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, strict referrer policy, Permissions Policy and HSTS in production. Responses containing personal/authenticated data use `Cache-Control: private, no-store`.

## Audit trail

Privileged content changes, role assignments, account state changes, login security events and report resolution write append-only `audit_logs`. The record includes a safe actor UUID, action, target type/id, timestamp and redacted metadata. Database triggers reject UPDATE/DELETE on `audit_logs`, `review_logs` and `xp_transactions` for the application role.

## Admin bootstrap

No admin password appears in seed, documentation or Git. An operator:

1. registers a normal account through the application;
2. sets `ADMIN_EMAIL` temporarily in the local/hosting environment;
3. runs `npm run admin:bootstrap` against the intended database;
4. removes the environment value and signs in again.

The command refuses a missing account, assigns the role idempotently and writes an audit record.

## Data minimization

Only email is required. Audience type is optional/private. Leaderboards default to hidden and expose nickname only. Logs do not include email unless an explicit operational need is documented. Retention and account anonymization are deployment-policy concerns; append-only educational records retain pseudonymous user IDs for integrity.

## Secrets

`.env` and local storage directories are ignored. `.env.example` contains names and safe placeholders only. Production requires a high-entropy session pepper and database credentials from the hosting secret store. Secrets are never embedded in client bundles.

## Known boundaries

MVP does not provide MFA, compromised-password lookup, outbound email verification, managed malware scanning or infrastructure DDoS protection. These are operational follow-ups, not claims of the current build.
