# JWT bearer tokens for authentication (not server-side sessions)

**Date:** 2026-08-29 · **Revised:** 2026-11-01 (HYP-122, HYP-149) · **Status:** accepted

Hypertube authenticates users with a **signed JWT** sent as
`Authorization: Bearer <token>`, issued by `POST /auth/login` and verified
on every protected route by a Passport `JwtStrategy`. We do not use
server-side sessions (cookie + session store).

## Why

- **The subject already mandates a token-based API.** Section III.4 requires
  a RESTful API with OAuth2 auth and a `POST /oauth/token` endpoint
  (`client + secret` -> auth token). Whatever we build for user login has
  to coexist with a token issuer/verifier anyway; using one token
  mechanism everywhere avoids running a session layer *and* a token layer
  in parallel.
- **SPA + REST API shape.** The React front consumes a REST API and can
  attach a bearer header naturally. Cookie sessions would pull in CSRF
  protection and stricter CORS-credentials handling for no gain here.
- **No session store.** The signature and `exp` claim prove a token; no
  per-token state is kept anywhere. One read remains on every request: the
  user's `credentialsChangedAt` by primary key, so that every token of an
  account dies when the account changes hands (an OAuth claim, ADR-0007).
  It also refuses the token of a deleted account. Simpler to run in
  containers than a session layer.
- **Matches the target internship stack** (`@nestjs/passport`,
  `passport-jwt`, `@nestjs/jwt`), a deliberate learning goal of this project.

## Nuance: `POST /oauth/token` is a different grant

The subject's `oauth/token` (`client + secret`) is the OAuth2
**client-credentials** grant. Here the client is an API key a user creates
for themselves ([ADR-0015](0015-api-keys-per-user-for-the-client-credentials-grant.md)),
so the token it returns acts on that user's behalf like a login token, plus
a `cid` claim naming the key. Both grants mint JWTs verified by the same
strategy; they differ in who authenticates and how.

## Consequences

- **One JWT cannot be revoked before it expires**, only all of an account's
  at once (`credentialsChangedAt`, set by a claim). Mitigations:
  - short access-token TTL, 15 minutes by default (`JWT_EXPIRES_IN`), and
    a rotating refresh token keeps the session alive and makes logout real
    (ADR-0011); the access token itself carries no server-side state.
  - **One-click logout** (subject requirement): `POST /auth/logout` revokes
    the session's refresh token on the server and clears the cookie
    ([ADR-0011](0011-rotating-refresh-tokens-in-an-httponly-cookie.md)). An access
    token already issued stays valid until it expires, 15 minutes at most.
- `JWT_SECRET` (and TTL config) live in `.env`, never committed.
- Token payload stays minimal (`sub` = user id); profile data is fetched,
  not carried in the token, so stale claims can't grant access.
