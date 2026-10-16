# Logout is client-side: discard the token, keep the TTL short

**Date:** 2026-10-16 · **Status:** accepted

The subject requires a one-click logout. Hypertube implements it as
`POST /auth/logout` (an authenticated no-op that answers `204`) plus the
frontend discarding its access token. The server keeps no revocation
state: the token simply stops being used, and expires on its own after
`JWT_EXPIRES_IN` (15 minutes by default).

## Why

- **It follows from ADR-0002.** We chose stateless JWTs so that no request
  needs a DB or cache round-trip. A logout that revokes tokens on the
  server would reintroduce exactly the state ADR-0002 avoided, for a
  project with a single backend instance and no real end users.
- **The exposure window is bounded.** A token that leaks after logout is
  usable for at most the remaining TTL (15 minutes). The TTL is validated
  at boot (ADR-0003), so it cannot silently drift to days.
- **The endpoint still exists on purpose.** The subject's RESTful API
  evidence and the defense benefit from a real route, and it gives a
  single place to add server-side revocation later without changing the
  frontend contract. It is protected by the global `JwtAuthGuard` (no
  `@Public()`), so an anonymous call gets `401`.

## Alternatives rejected

- **Token blocklist (DB/Redis, keyed by `jti`).** True server-side
  invalidation, but it adds a table or a service, one lookup per
  authenticated request, and a cleanup job for expired entries. Cost
  is out of proportion with the threat for a graded school project.
- **Short access token + refresh-token rotation.** The most complete
  answer (logout revokes the refresh token, reuse is detectable), but it
  needs refresh-token storage, a rotation endpoint, reuse detection and a
  silent-refresh flow on the frontend. That is a feature of its own, not a
  logout ticket. It stays the upgrade path if the project ever needs
  real revocation.

## Consequences

- **A stolen token stays valid until it expires**, even after the user
  logged out. Recorded in `docs/defense/known-limitations.md`.
- `POST /auth/logout` does nothing server-side today. A test pins the
  contract (`204` with a valid token, `401` without) so a future
  revocation change is a conscious one.
- Lowering `JWT_EXPIRES_IN` is the only knob that shrinks the window.
