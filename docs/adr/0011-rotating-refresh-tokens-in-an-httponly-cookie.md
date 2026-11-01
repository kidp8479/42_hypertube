# Refresh tokens rotate in an HttpOnly cookie, and logout revokes the session

**Date:** 2026-10-23 · **Revised:** 2026-10-25 (HYP-78, HYP-84) ·
**Status:** accepted · Supersedes
[ADR-0008](0008-client-side-logout-with-short-lived-jwt.md) on revocation ·
Amends [ADR-0002](0002-jwt-bearer-tokens-for-authentication.md) and
[ADR-0006](0006-frontend-architecture.md) on where the token lives

A session is two tokens. The **access token** is a 15 minute JWT (stateless,
`Authorization: Bearer`). A **refresh token** keeps the session alive: 256 random bits in an `HttpOnly` cookie, stored hashed in the
`refresh_token` table and **rotated every time it is used**. Logout revokes the
session on the server.

## Why

- A 15 minute session is unusable for a video app: any 401 mid-session sends
  the SPA to `/login`, which would stop a film halfway. A longer access token
  widens the window of a stolen one.
- A logout that only discards the token client-side (ADR-0008) cannot end a
  session: a copied token works until it expires.
- An access token in `localStorage` is readable by an XSS. It lives in memory;
  only an `HttpOnly` cookie, which no script can read, survives a reload.

## How it works

- **Opaque and hashed.** Only the SHA-256 is stored. A fast hash is right here,
  unlike for a password: there is nothing to guess offline, and the lookup needs
  a deterministic value.
- **Rotation and reuse detection.** `POST /auth/refresh` consumes the cookie's
  token and answers a new access token and the next refresh token. The rows of
  one login form a *family*. A consumed token used again means a copy was
  stolen, so the whole family is revoked, the legitimate holder included.
- **10 second tolerance** on a just-consumed token, so two tabs or a retry
  refreshing at once are not read as theft.
- **Lifetimes.** 7 days sliding (`REFRESH_EXPIRES_IN`, how long a session may sit
  idle) and 30 days at most from the login.
- **The cookie.** `HttpOnly`, `Secure` over HTTPS, `SameSite=Strict`, scoped to
  the auth routes (the path follows `X-Forwarded-Prefix`, as for the OAuth state
  cookie, ADR-0007). It never appears in a body or a URL.
- **CSRF.** `SameSite=Strict` keeps the cookie off cross-site requests, the CORS
  policy keeps a foreign page from reading the answer, and a forged refresh could
  only rotate the caller's own token.
- **Logout is public and cookie driven**, so it works after the access token
  expired: it revokes the family, clears the cookie, and answers 204 even with
  nothing to revoke.
- `POST /auth/login` and `POST /auth/oauth/exchange` open the session and
  return the access token in the body.
- **No cookie at all is a 204 with no body**, not a 401: the SPA calls
  `POST /auth/refresh` on every load to learn whether there is a session, and a
  401 for each anonymous visit would print a red line in the browser console
  (the defense requires a clean one). A cookie that is sent but not accepted
  (unknown, expired, revoked, reused) is the same 401 and is cleared.
- **A credential change ends the other sessions.** Changing the email or the
  password through `PATCH /users/:id` revokes every family of the user, then
  sets a new cookie for the caller. The change needs `currentPassword` (an
  account without one cannot change either), so a stolen access token alone
  cannot take the account over. The route
  never sees the caller's own cookie (scoped to the auth routes), so "every
  session but this one" is "every session, then a new one".
- `/auth/refresh` is throttled (20 per minute). Rows expired for over a day are
  deleted as tokens are issued: no scheduler.

## Rejected

A longer access token (one setting, but logout still cannot end a session);
renewing the JWT with itself (a stolen token would renew for ever); the refresh
token in `localStorage` or the body (readable by any script); a blocklist of
access-token ids (a lookup per request for a 15 minute window).

## Consequences

- An access token copied before a logout or a detected theft still works until
  it expires (15 minutes), but nothing can renew it. In
  `docs/defense/known-limitations.md`.
- A stateful table now sits behind login, touched at login, refresh and logout,
  never on an ordinary request.
- The SPA keeps the access token in memory and refreshes on load and on a 401
  (`docs/diagrams/auth.md` section 8).
- A film must outlive the access token: the player will use its own short-lived
  signed stream token (HYP-14), not the JWT.
