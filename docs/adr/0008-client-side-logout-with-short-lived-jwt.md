# Logout is client-side: discard the token, keep the TTL short

**Date:** 2026-10-16 · **Status:** superseded by
[ADR-0011](0011-rotating-refresh-tokens-in-an-httponly-cookie.md)

The decision: `POST /auth/logout` as an authenticated no-op (`204`), the
frontend discarding its access token, and no revocation state on the
server. A token leaked after logout stayed usable until it expired
(`JWT_EXPIRES_IN`, 15 minutes).

## Why it was taken

It followed from the stateless JWTs of
[ADR-0002](0002-jwt-bearer-tokens-for-authentication.md): a single backend
instance, no real end users, and the exposure bounded by the short TTL. The
rejected alternatives were a blocklist of token ids (a lookup per request
and a cleanup job) and refresh-token rotation (a feature of its own, named
as the upgrade path).

## Why it was superseded

A 15 minute session cannot hold a film, and a logout that cannot end a
session is weak evidence for the subject's one-click logout. ADR-0011 took
the upgrade path: rotating refresh tokens in an `HttpOnly` cookie, and a
logout that revokes the session on the server.
