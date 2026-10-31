# API keys per user for the client-credentials grant

**Date:** 2026-10-31 · **Status:** accepted

The subject's API section documents `POST oauth/token`: "Expects client +
secret, returns an auth token". The same API must let an authenticated user
read any profile but update only their own (403 otherwise). So the token that
endpoint returns has to carry a user.

A **client** is an API key a user creates for themselves (`api_client`
table, `backend/src/api-clients/`):

- `POST /api-clients` (login token) creates one and answers its `clientId`
  and `secret`. That response is the only place the secret ever appears.
  `GET /api-clients` lists the caller's keys without it, and
  `DELETE /api-clients/:id` revokes one (403 for another user's key, 404 for
  an unknown one). At most 5 keys per user (409).
- `POST /oauth/token` takes `client` + `secret` (JSON or form-encoded,
  optional `grant_type=client_credentials`) and answers the RFC 6749 shape
  `{ access_token, token_type: "Bearer", expires_in }`. The token is a normal
  JWT for the key's owner, plus a `cid` claim naming the key. An unknown
  client and a wrong secret are the same 401.

## Why

- **Per user, not one app-wide client.** A single client in `.env` would
  give tokens that belong to nobody. `/users/me` and the 403 on another
  user's profile would then have no meaning through this endpoint, and
  `GET /users/:id` could not tell the owner from a stranger. Bound to a user,
  the token goes through the same guard and the same ownership checks as a
  login token, with no special case.
- **Not `client` = username, `secret` = password.** That is the OAuth2
  password grant renamed, which ADR-0002 already set apart from this one.
  It would also make the password a script credential.
- **The subject's field names.** A grader who copies the documentation
  (`client`, `secret`) must not get a 400 from the global
  `forbidNonWhitelisted` validation. The RFC names `client_id` and
  `client_secret` are refused: accepting both spellings would mean either-or
  validation for no grading gain.
- **SHA-256 at rest, not argon2.** The secret is 256 random bits
  (`generateSecret`, shared with the refresh tokens), so there is nothing to
  guess offline and a fast hash is enough. It is compared in constant time.
- **A `cid` claim, and two routes that refuse it** (`SessionTokenGuard`, 403).
  On key management, so a leaked secret cannot mint a new key that outlives
  its revocation. On `DELETE /users/:id`, so a script secret cannot erase
  the account. An email or password change already needs `currentPassword`.

## Consequences

- **A revoked key's tokens live until they expire**, 15 minutes by default:
  access tokens are stateless (ADR-0002, `known-limitations.md`). Revoking
  stops new tokens at once.
- **Keys survive a password change.** They are separate credentials, like a
  personal access token, and the owner revokes them one by one. The email or
  password change ends the browser sessions only (HYP-84).
- **No refresh token for a client.** It asks again with its secret.
  `POST /oauth/token` has its own rate limit (`OAUTH_TOKEN_THROTTLE`).
- **There is no UI yet to create a key.** An evaluator logs in through
  Swagger (`/api-docs`), calls `POST /api-clients`, then `POST /oauth/token`.
  The Bruno collection (requests 46 to 56) follows the same path.
