# JWT bearer tokens for authentication (not server-side sessions)

**Date:** 2026-08-29 · **Status:** accepted

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
- **Stateless verification.** No Redis/DB round-trip to check a session on
  every request; the signature and `exp` claim are enough. Simpler to run
  in containers.
- **Matches the target internship stack** (`@nestjs/passport` + `passport-jwt`
  + `@nestjs/jwt`), which is a deliberate learning goal for this project.

## Nuance: `POST /oauth/token` is a different grant

The subject's `oauth/token` (`client + secret`) is the OAuth2
**client-credentials** grant — it authenticates a *client application* of
the API, not a browser user logging in. It is related to, but not the same
as, `POST /auth/login`. Both will mint JWTs verified by the same strategy;
they differ in who authenticates and how.

## Consequences

- **A JWT cannot be revoked before it expires.** Mitigations, to be
  decided at implementation:
  - short access-token TTL (~15 min) + refresh token, vs. a single longer
    token — trade-off between UX and blast radius.
  - **One-click logout** (subject requirement): with a pure JWT, logout is
    client-side (discard the token). A true server-side invalidation needs
    a token blocklist or DB-backed refresh tokens — a deliberate,
    contained break from "stateless". Decision deferred to its own ADR.
- `JWT_SECRET` (and TTL config) live in `.env`, never committed.
- Token payload stays minimal (`sub` = user id); profile data is fetched,
  not carried in the token, so stale claims can't grant access.
