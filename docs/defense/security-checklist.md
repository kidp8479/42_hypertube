# Security checklist

Inventory of every security control in the codebase: what it defends
against, where it lives, and how to prove it. Companion to
[`traceability.md`](traceability.md), which stays verdict-level (one row
per subject requirement); this file is the mechanism-level view and is
also where the accepted **gaps** are written down.

Scope today: the auth surface (`/auth/login`, `/users`, the OAuth 42 /
GitHub handshake and `/auth/oauth/exchange`) and the app-wide guards.
Grows as `movies` / `comments` / `torrent` land. Tied to HYP-16 (final
security audit).

Proof is cited as a file path, not a test count. All spec files below are
committed under `backend/src/`.

## 1. No plaintext password anywhere

| Control | Where | Proof |
|---|---|---|
| Passwords hashed with argon2id before insert | `users.service.ts` `create()` calls `argon2.hash(..., ARGON2_OPTIONS)` | `users.service.spec.ts`; ADR-0001 |
| Hash cost pinned, not left to library defaults | `auth/argon2.config.ts` (m = 19 MiB, t = 2, p = 1, OWASP) | ADR-0004 |
| Hash column kept out of normal reads | `user.entity.ts` `@Column({ select: false })` on `password` | `user.entity.spec.ts` |
| Hash stripped from every response body even when loaded on purpose | `@Exclude()` on the column + global `ClassSerializerInterceptor` in `main.ts` | `users.controller.spec.ts` (serialized output has no `password`) |
| Login reads the hash deliberately, never by default | `users.service.ts` `findForLogin()` (username or email) reads it through `findWithPassword()`, a query-builder `addSelect('user.password')` | `users.service.spec.ts` |

`select: false` and `@Exclude()` are two independent nets: the first
keeps the hash out of the row, the second drops it at serialization if a
future query loads it anyway.

## 2. No SQL injection

| Control | Where |
|---|---|
| All data access goes through the TypeORM repository / query builder; no string concatenation with user input | `users.service.ts` is the only module that touches the repo (`UsersService` doc comment enforces this by convention) |
| Parameterised `where` in the hand-written queries | `UsersService.findWithPassword(where, params)`, called with `'user.email = :email'` and `'LOWER(user.username) = LOWER(:identifier)'`: the value always travels as a parameter |
| Numeric route params validated before any query is built | `users.controller.ts` `@Param('id', ParseIdPipe)` (`common/pipes/parse-id.pipe.ts`) - a non-numeric or out-of-range `:id` is 400 before the service runs, so no query is built from `NaN` | 
| Proof | `users.controller.params.spec.ts`; code review - grep for template strings in `.where(` / `.query(` returns nothing |

## 3. No HTML / JS injection

| Control | Where | State |
|---|---|---|
| Backend returns JSON only, no server-rendered HTML | all controllers | done |
| React escapes interpolated values by default; no `dangerouslySetInnerHTML` in the tree | `frontend/src/` | done |
| Content-Security-Policy response header | not set yet | **gap - HYP-49** |
| Helmet (security response headers) | not wired | **gap - HYP-49** |

## 4. Input validation

| Control | Where | Proof |
|---|---|---|
| Global `ValidationPipe` with `whitelist` + `forbidNonWhitelisted` + `transform` | `main.ts` | unknown field in a body returns 400 |
| Typed DTOs with `class-validator` constraints | `users/dto/create-user.dto.ts`, `users/dto/update-user.dto.ts`, `auth/dto/login.dto.ts` | DTO specs |
| Email normalised + validated; length-capped | `@NormalizeEmail()` + `@IsEmail()` + `@MaxLength(255)` | `common/decorators/normalize-email.decorator.spec.ts` |
| Strings trimmed at the edge | `@Trim()` on `username` | `common/decorators/trim.decorator.spec.ts` |
| Registration password length 8-100; login password only size-capped (no policy hint to an attacker, accepts any legacy value) | `create-user.dto.ts` vs `login.dto.ts` | DTO specs |
| `PATCH /users/:id` changes the email or the password only with `currentPassword` (400 missing, 403 wrong), never on an account without a password (400, reset flow); a new password is hashed with argon2id; a new email is unverified; `profilePicture` must be an https URL | `users.service.ts` `update()`, `dto/update-user.dto.ts` | `users.service.spec.ts`, `users.controller.update.spec.ts`, Bruno 37-39, 43 |
| File-upload validation | avatar upload not built | **gap - HYP-38** |
| Password strength meter (zxcvbn or blocklist) | not built | **gap - HYP-37** |

Never trust a client-supplied id or role for an authorization decision:
the id checked for ownership comes from the verified token
(`req.user.id`), never from the body.

## 5. Authentication and session

| Control | Where | Proof |
|---|---|---|
| Every route requires a valid Bearer token unless explicitly `@Public()` | global `JwtAuthGuard` (`APP_GUARD` in `app.module.ts`) | `auth/guards/jwt-auth.guard.spec.ts` |
| Token signature + expiry verified on every request; `ignoreExpiration: false` | `auth/strategies/jwt.strategy.ts` | `auth/strategies/jwt.strategy.spec.ts` |
| Token payload carries only `sub` (user id); profile / roles fetched per request, never trusted from the token | `auth.service.ts` `login()`, `jwt.strategy.ts` `validate()` | ADR-0002 |
| `JWT_SECRET` >= 32 chars, and the `.env.example` placeholder is rejected at boot | `config/env.validation.ts` | `config/env.validation.spec.ts` |
| Signing key asserted present at startup, not lazily | `jwt.strategy.ts` `config.getOrThrow('JWT_SECRET')` | |
| One-click logout: `POST /auth/logout` (public, driven by the refresh cookie) revokes the whole session and clears the cookie, then the SPA discards its token and query cache | `auth.controller.ts`, `refresh-token.service.ts`, `frontend/src/features/auth/` | `auth/auth.session.spec.ts`, `auth.controller.spec.ts`, Bruno 33-34, `frontend/src/features/auth/auth-provider.test.tsx` |
| An email or password change revokes every refresh-token family of the user and issues a new one to the caller only; a taken email (409) revokes nothing | `users.controller.ts` `update()` | `users.controller.update.spec.ts`, Bruno 39-42; ADR-0011 |
| Auto-linking a provider to an unverified account claims it first: password removed, every session revoked, other provider links deleted, email marked verified | `auth.service.ts` `resolveOAuthUser()` | `auth.service.spec.ts`; ADR-0007 |
| Refresh tokens: 256 random bits in an `HttpOnly`, `SameSite=Strict`, `Secure` cookie scoped to the auth routes, only their SHA-256 stored, rotated on every use; a consumed token used again (after a 10 s tolerance) revokes its whole session; 7 days sliding, 30 days at most from the login | `auth/refresh-token.service.ts`, `auth/refresh-cookie.util.ts`, `auth/entities/refresh-token.entity.ts` | `refresh-token.service.spec.ts`, `refresh-cookie.util.spec.ts`, `auth.session.spec.ts`, Bruno 26-34; ADR-0011 |
| Access token revocation before its expiry | stateless on purpose, nothing can renew it after a logout | **accepted limit** - 15 minutes, ADR-0011, `docs/defense/known-limitations.md` |
| Access token in memory only, never in `localStorage`: a reload restores it from the refresh cookie, a 401 refreshes once (single flight) and retries | `frontend/src/lib/token.ts`, `frontend/src/lib/api.ts` | `lib/api.test.ts`, `auth-provider.test.tsx`, `frontend/e2e/session.spec.ts` |
| Token TTL | `JWT_EXPIRES_IN` default `15m`, `REFRESH_EXPIRES_IN` default `7d` | `env.validation.ts` |

## 5b. OAuth sign-in (42, GitHub)

| Control | Where | Proof |
|---|---|---|
| Login CSRF: `state` must equal a one-shot nonce cookie set by `/auth/<provider>/login` (`HttpOnly`, `SameSite=Lax`, `Path=/auth`, ~10 min, `Secure` in production), compared in constant time and cleared on the callback | `auth/strategies/cookie-state.store.ts`, passed as `store` to both strategies | `cookie-state.store.spec.ts`; Bruno 17-18; `frontend/e2e/oauth.spec.ts` |
| No JWT in a URL: the callback redirects to the SPA with a single-use exchange code (32 random bytes, 60 s TTL, deleted on first use), traded for the token by `POST /auth/oauth/exchange` | `auth/oauth-exchange.service.ts`, `auth.controller.ts` | `oauth-exchange.service.spec.ts`; Bruno 19-20 |
| Unknown, used and expired codes answer the same `401` | `AuthController.exchange` | `auth.controller.spec.ts` |
| A provider identity auto-links to an existing account only through a verified email: a strategy returns only a provider-verified address or refuses the login (GitHub: primary + verified row of `/user/emails`, never the public profile email) | `auth.service.ts` `resolveOAuthUser`, `oauth-profile.interface.ts`, `github.strategy.ts` | `auth.service.spec.ts`, `github.strategy.spec.ts`; ADR-0007 |
| One provider account maps to one local user: unique `(provider, providerUserId)`, the loser of a link race signs in through the winner's row | `auth/entities/oauth-account.entity.ts`, `AuthService.recoverFromLinkRace` | `auth.service.spec.ts` |
| A failed callback leaks nothing: it redirects to the SPA with one of three reasons (`cancelled`, `email_unverified`, `failed`), details stay in the server log; success and failure redirects send `Referrer-Policy: no-referrer` (the callback URL holds the provider's `code` and `state`) | `auth/filters/oauth-callback.filter.ts`, `auth/decorators/oauth-callback.decorator.ts` | `oauth-callback.filter.spec.ts`; Bruno 17-18; ADR-0007 amendment |

## 6. Account-existence disclosure

| Surface | State | Detail |
|---|---|---|
| `POST /auth/login` | done | wrong password and unknown username or email return the same `401` with no body detail; `AuthService.validateUser` verifies against a startup-generated `dummyHash` so a missing account costs the same argon2 time as a real one |
| `POST /users` (register) | **partial** | `QueryFailedFilter` maps a duplicate email/username to `409 "Resource already exists"` (generic message, does not name the field) while a fresh registration returns `201`. The differing status code is still an existence oracle. The `10 / hour` throttle blunts bulk enumeration but not a targeted check. Tracked as **HYP-50** (uniform-response registration); the filter comment already flags this. |
| `POST /auth/reset-password` | not built | must land equalised - **HYP-34** |

## 7. Rate limiting

| Scope | Limit | Where |
|---|---|---|
| Every route, per client IP (the address the edge proxy appended: `trust proxy`, ADR-0009) | 100 / 60 s | `DEFAULT_THROTTLE`, `ThrottlerModule.forRoot` in `app.module.ts`, `config/trust-proxy.config.ts` |
| `POST /auth/login`, per IP | 5 / 60 s | `LOGIN_THROTTLE`, `@Throttle` on `auth.controller.ts` |
| `POST /auth/login`, per identifier whatever the IP (trimmed and lower-cased; an unknown identifier counts the same, so a 429 reveals nothing; the trade-off is in `docs/diagrams/auth.md` section 10) | 5 / 60 s | `LoginIdentifierThrottlerGuard` (`auth/guards/`) |
| `PATCH /users/:id` (checks the current password on an email or password change) | 10 / 60 s | `PROFILE_EDIT_THROTTLE`, `@Throttle` on `users.controller.ts` |
| `POST /users` (register) | 10 / 3600 s | `REGISTER_THROTTLE`, `@Throttle` on `users.controller.ts` |
| `POST /auth/refresh` | 20 / 60 s | `REFRESH_THROTTLE`, `@Throttle` on `auth.controller.ts` |
| `POST /auth/oauth/exchange` | 10 / 60 s | `OAUTH_EXCHANGE_THROTTLE`, `@Throttle` on `auth.controller.ts` |
| Dev multiplier | `THROTTLE_LIMIT_MULTIPLIER` scales every limit above; the env schema rejects a value above 1 when `NODE_ENV=production` | `config/throttle.config.ts` (every policy is named there), `config/env.validation.ts` |
| Proof | | `auth/auth.throttle.spec.ts`, `config/throttle.config.spec.ts`, `auth/guards/login-identifier-throttler.guard.spec.ts` |

Guard order in `app.module.ts` is deliberate: `ThrottlerGuard` is
registered before `JwtAuthGuard`, so an unauthenticated flooder is capped
before the token check runs. The counter is in-process; a shared Redis
store is only needed once more than one backend instance runs (noted in
`app.module.ts`).

## 8. Authorization (ownership)

| Control | Where | Proof |
|---|---|---|
| `PATCH /users/:id` and `DELETE /users/:id` return `403` unless `req.user.id === :id` | `users.controller.ts` `update()` / `remove()` | `users.controller.spec.ts` |
| Any profile can be read, but the email stays private (subject III.1, III.4): `GET /users` gives `id` and `username` only, `GET /users/:id` gives `id`, `username` and `profilePicture` to anyone but the owner, who gets the full profile | `users.controller.ts` `findAll()` / `findOne()`, `dto/user-summary.dto.ts`, `dto/public-user.dto.ts` | `users.controller.fields.spec.ts`, Bruno 08 and 10 |

## 9. Error handling / information leakage

| Control | Where |
|---|---|
| Postgres unique-violation mapped to `409` with a generic message instead of a raw `500` + SQL dump in the logs | `common/filters/query-failed.filter.ts` | 
| Non-constraint DB errors fall through to the default filter (no custom leakage path) | same file |
| Proof | `common/filters/query-failed.filter.spec.ts` |

## 10. Secrets and configuration

| Control | Where |
|---|---|
| Secrets only via env; no `.env` file read in-process (Compose / deploy inject directly) | `app.module.ts` `ConfigModule.forRoot({ ignoreEnvFile: true })` |
| `.env` git-ignored; `.env.example` ships placeholders only | `.gitignore`, `.env.example` |
| Placeholder secrets rejected at boot | `config/env.validation.ts` `ENV_EXAMPLE_PLACEHOLDERS` |
| Full env schema validated at startup, deploy fails fast on a missing / malformed var | `config/env.validation.ts`; ADR-0003 |
| gitleaks secret scan | CI (`.github/workflows/gitleaks.yml`, required `scan` check on `main`) |
| Dependency CVEs | Dependabot (policy in `docs/deps/`) |
| TLS terminated at the edge proxy (self-signed in dev, a mounted certificate elsewhere); HTTP redirects to HTTPS; `nosniff` and frame options at the edge; HSTS only when `PROXY_HSTS_MAX_AGE` is set. CSP and helmet remain open (HYP-49) | `proxy/`, ADR-0009 |
| Edge proxy hardening from the web-security-review of HYP-71 (HYP-73): the HTTP redirect goes to a configured name, not the Host header; the access log keeps no query string or Referer (OAuth codes); `X-Forwarded-For` is set in every location | `proxy/templates/default.conf.template`, `proxy/snippets/`, ADR-0009 |
| CORS locked to a single configured origin (no `*`, no credentialed requests: the JWT is a bearer header) | `main.ts` `enableCors` (`FRONTEND_ORIGIN`, falls back to the Vite dev server) |
| Every backend response is `Cache-Control: no-store`: per-user data is never replayed from the browser cache (a stale profile after a reload) nor left on disk after logout | `config/no-store.config.ts` (`no-store.config.spec.ts`, Bruno 09) |

## 11. Schema / data integrity

| Item | State |
|---|---|
| Schema management | TypeORM migrations build the schema (`backend/src/migrations/`), applied at boot in every environment; `synchronize` is off everywhere (`database/database.config.ts`). The `e2e` CI job boots on an empty database and `migration:check` fails if an entity changed without a migration. ADR-0010. |

## Open gaps (summary)

| Gap | Ticket | Severity |
|---|---|---|
| Register leaks account existence via `409` vs `201` status code | HYP-50 | medium - throttled, but real |
| Login is throttled per IP only, while usernames (the login key since HYP-91) are listed to every signed-in user | HYP-94 | medium - password spraying from many IPs |
| No CSP / Helmet response headers | HYP-49 (HYP-28 is an older duplicate) | medium |
| An access token cannot be revoked before it expires (the refresh token is revoked on logout) | ADR-0011 (accepted) | low (15 minutes) |
| An email change is not verified | HYP-39 | low - it takes `currentPassword`, and the new email stays unverified, so the provider owner of that address claims the account |
| Upload validation not built | HYP-38 | n/a until uploads exist |
| Password strength check not built | HYP-37 | low |

## Notes

- The subject is dated (v7.1). Reconfirm the exact eliminatory wording on
  the intra before the final defense.
- Last `web-security-review` run over the auth surface:
  [`security-review-2026-10-24.md`](security-review-2026-10-24.md).
  Run it again before HYP-16 is closed.
