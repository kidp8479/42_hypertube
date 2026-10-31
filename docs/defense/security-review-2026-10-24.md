# Auth surface: web-security-review, 2026-10-24

The `web-security-review` checklist, run over the whole auth surface at
`main` `1be296b`: registration (`POST /users`), login, OAuth 42 and GitHub
(state cookie, callback, exchange code), refresh-token rotation, logout, the
users routes, and the edge proxy. Each point was checked in the code, not
from the docs.

**Verdict: nothing blocking.** The open points are ticketed below.

| Point | Status | Evidence |
|---|---|---|
| Passwords hashed with argon2id | OK | `config/argon2.config.ts`; the hash never leaves the server (`@Exclude` on `User.password`, global `ClassSerializerInterceptor`) |
| Sensitive tokens: CSPRNG, single use, short life, hashed at rest | OK | Refresh: 256 random bits, SHA-256 hash stored, rotated on every use, family revoked on reuse after 10 s, 30-day absolute cap (`refresh-token.service.ts`). Exchange code: 256 bits, single use, 60 s, in memory (`oauth-exchange.service.ts`). OAuth state: random nonce in a cookie, compared in constant time, cleared after use (`cookie-state.store.ts`) |
| No secret or token in the logs | OK | One `Logger`, in `oauth-callback.filter.ts` (message or error, no token); nginx logs no query string (HYP-73) |
| Authentication and ownership on every mutating route | OK | `JwtAuthGuard` global (`APP_GUARD`), `@Public()` opt-out only; `PATCH` / `DELETE /users/:id` answer 403 unless `:id` is the caller |
| No authorization decision from client data, no IDOR | OK | The caller comes from the JWT `sub`; `GET /users/:id` returns `PublicUserDto` to anyone but the owner (HYP-80) |
| No account enumeration | Open: HYP-50 | Login: same 401 and same timing for an unknown email (`AuthService.dummyHash`). Registration still answers 409 on a taken email |
| Rate limiting on auth routes | OK | Per real client address (trusted proxy, HYP-71): login 5/min, registration 10/h, refresh 20/min, exchange 10/min |
| Strict input validation | OK | Global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`); uploads not built yet (HYP-38) |
| SQL injection | OK | TypeORM repositories and parameterised queries only |
| HTML / JS injection | OK | React escaping, no `dangerouslySetInnerHTML` |
| Security headers | Open: HYP-49 | The proxy sets `X-Content-Type-Options`, `X-Frame-Options: DENY`, HSTS (configurable, off on localhost); no CSP yet |
| Cookies | OK | Refresh: `HttpOnly`, `SameSite=Strict`, path limited to the auth routes, `Secure` over HTTPS. OAuth state: `SameSite=Lax`, needed for the redirect back from the provider |
| No token in `localStorage` | Open: HYP-78 | The access token is still in `localStorage`. With no CSP, an XSS could read it (15 minutes of access); the refresh token is out of reach of scripts |
| CORS | OK | One origin, `FRONTEND_ORIGIN`, no wildcard |
| Logout ends the session on the server | OK | The refresh family is revoked and the cookie cleared; the access token lives out its 15 minutes (`known-limitations.md`) |
| Sessions after a credential change | Open: HYP-84 | Changing the password or the email must revoke the other refresh families |
| Secrets in `.env` only, gitleaks | OK | `.env` git-ignored, Joi rejects the example JWT secret, gitleaks in CI (required check) |
| No error detail in production | OK | Generic 500 body; a unique violation becomes a generic 409 (`query-failed.filter.ts`) |
| Dependencies | OK | No open Dependabot PR |

Trade-offs already recorded: the 10 s reuse leeway on refresh tokens
(ADR-0011), and Swagger served in every environment, as the REST proof for
the defense.

## Found on the way

The subject (III.1) asks to log in with the **username** and password; the
login takes the email today. Not a security defect, a subject gap: HYP-91.
