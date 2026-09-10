# Security checklist

Inventory of every security control in the codebase: what it defends
against, where it lives, and how to prove it. Companion to
[`traceability.md`](traceability.md), which stays verdict-level (one row
per subject requirement); this file is the mechanism-level view and is
also where the accepted **gaps** are written down.

Scope today: the auth surface (`/auth/login`, `/users`) and the app-wide
guards. Grows as `movies` / `comments` / `torrent` land. Tied to HYP-16
(final security audit).

Proof is cited as a file path, not a test count. All spec files below are
committed under `backend/src/`.

## 1. No plaintext password anywhere

| Control | Where | Proof |
|---|---|---|
| Passwords hashed with argon2id before insert | `users.service.ts` `create()` calls `argon2.hash(..., ARGON2_OPTIONS)` | `users.service.spec.ts`; ADR-0001 |
| Hash cost pinned, not left to library defaults | `auth/argon2.config.ts` (m = 19 MiB, t = 2, p = 1, OWASP) | ADR-0004 |
| Hash column kept out of normal reads | `user.entity.ts` `@Column({ select: false })` on `password` | `user.entity.spec.ts` |
| Hash stripped from every response body even when loaded on purpose | `@Exclude()` on the column + global `ClassSerializerInterceptor` in `main.ts` | `users.controller.spec.ts` (serialized output has no `password`) |
| Login reads the hash deliberately, never by default | `users.service.ts` `findByEmail()` uses a query-builder `addSelect('user.password')` | `users.service.spec.ts` |

`select: false` and `@Exclude()` are two independent nets: the first
keeps the hash out of the row, the second drops it at serialization if a
future query loads it anyway.

## 2. No SQL injection

| Control | Where |
|---|---|
| All data access goes through the TypeORM repository / query builder; no string concatenation with user input | `users.service.ts` is the only module that touches the repo (`UsersService` doc comment enforces this by convention) |
| Parameterised `where` in the one hand-written query | `findByEmail()`: `.where('user.email = :email', { email })` |
| Numeric route params validated before any query is built | `users.controller.ts` `@Param('id', ParseIntPipe)` - a non-numeric `:id` is 400 before the service runs, so no query is built from `NaN` | 
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
| `email` / `password` cannot be changed by `PATCH /users/:id` | `update-user.dto.ts` omits both from the partial type | `update-user.dto.ts` doc comment |
| File-upload validation | avatar upload not built | **gap - HYP-38** |
| Password strength meter (zxcvbn or blocklist) | not built | **gap - HYP-37** |

Never trust a client-supplied id or role for an authorization decision:
the id checked for ownership comes from the verified token
(`req.user.id`), never from the body.

## 5. Authentication and session

| Control | Where | Proof |
|---|---|---|
| Every route requires a valid Bearer token unless explicitly `@Public()` | global `JwtAuthGuard` (`APP_GUARD` in `app.module.ts`) | `auth/jwt-auth.guard.spec.ts` |
| Token signature + expiry verified on every request; `ignoreExpiration: false` | `auth/jwt.strategy.ts` | `auth/jwt.strategy.spec.ts` |
| Token payload carries only `sub` (user id); profile / roles fetched per request, never trusted from the token | `auth.service.ts` `login()`, `jwt.strategy.ts` `validate()` | ADR-0002 |
| `JWT_SECRET` >= 32 chars, and the `.env.example` placeholder is rejected at boot | `config/env.validation.ts` | `config/env.validation.spec.ts` |
| Signing key asserted present at startup, not lazily | `jwt.strategy.ts` `config.getOrThrow('JWT_SECRET')` | |
| One-click logout (client-side token + query-cache discard) | `frontend/src/features/auth/` | `frontend/src/features/auth/auth-provider.test.tsx` |
| Server-side token invalidation on logout | stateless JWT, not implemented | **gap - HYP-35**, decision pending in `docs/adr/README.md` |
| Token TTL | `JWT_EXPIRES_IN` default `15m` | `env.validation.ts` |

## 6. Account-existence disclosure

| Surface | State | Detail |
|---|---|---|
| `POST /auth/login` | done | wrong password and unknown email return the same `401` with no body detail; `AuthService.validateUser` verifies against a startup-generated `dummyHash` so a missing account costs the same argon2 time as a real one |
| `POST /users` (register) | **partial** | `QueryFailedFilter` maps a duplicate email/username to `409 "Resource already exists"` (generic message, does not name the field) while a fresh registration returns `201`. The differing status code is still an existence oracle. The `10 / hour` throttle blunts bulk enumeration but not a targeted check. Tracked as **HYP-50** (uniform-response registration); the filter comment already flags this. |
| `POST /auth/reset-password` | not built | must land equalised - **HYP-34** |

## 7. Rate limiting

| Scope | Limit | Where |
|---|---|---|
| Every route, per IP | 100 / 60 s | `ThrottlerModule.forRoot` in `app.module.ts` |
| `POST /auth/login` | 5 / 60 s | `@Throttle` on `auth.controller.ts` |
| `POST /users` (register) | 10 / 3600 s | `@Throttle` on `users.controller.ts` |
| Proof | | `auth/auth.throttle.spec.ts` |

Guard order in `app.module.ts` is deliberate: `ThrottlerGuard` is
registered before `JwtAuthGuard`, so an unauthenticated flooder is capped
before the token check runs. The counter is in-process; a shared Redis
store is only needed once more than one backend instance runs (noted in
`app.module.ts`).

## 8. Authorization (ownership)

| Control | Where | Proof |
|---|---|---|
| `PATCH /users/:id` and `DELETE /users/:id` return `403` unless `req.user.id === :id` | `users.controller.ts` `update()` / `remove()` | `users.controller.spec.ts` |
| Reading another profile (`GET /users/:id`) stays allowed, per the subject | `users.controller.ts` | |
| `GET /users` returns every user's `email`, `firstName`, `lastName` (hash excluded) to any authenticated caller | `users.service.ts` `findAll()` | **decision, not a bug**: the subject imposes `/users`. Whether the list should be trimmed to public fields is open - `docs/defense/backlog.md` |

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
| gitleaks secret scan | pre-commit hook + CI |
| Dependency CVEs | Dependabot (policy in `docs/deps/`) |
| CORS locked to a single configured origin, `credentials: true` | `main.ts` `enableCors` (`FRONTEND_ORIGIN`, falls back to the Vite dev server) |

## 11. Schema / data integrity

| Item | State |
|---|---|
| `synchronize: true` (auto-schema from entities) | dev / test only, off in production (`app.module.ts`). Acceptable now; must become real TypeORM migrations before the defense - reproducible schema, no silent data loss. Decision + cutover point tracked in `docs/adr/README.md` and the project `CLAUDE.md`. |

## Open gaps (summary)

| Gap | Ticket | Severity |
|---|---|---|
| Register leaks account existence via `409` vs `201` status code | HYP-50 | medium - throttled, but real |
| No CSP / Helmet response headers | HYP-49 (HYP-28 is an older duplicate) | medium |
| No TypeORM migrations (still `synchronize`) | ADR-planned | medium before defense |
| No server-side logout / token revocation | HYP-35 | low (short TTL) |
| Upload validation not built | HYP-38 | n/a until uploads exist |
| Password strength check not built | HYP-37 | low |
| `GET /users` exposes all basic profile fields to any member | backlog | low - review |

## Notes

- The subject is dated (v7.1). Reconfirm the exact eliminatory wording on
  the intra before the final defense.
- Re-run the `web-security-review` skill against this file before HYP-16
  is closed.
