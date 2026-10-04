# OAuth identity linking, GitHub as the second provider

**Date:** 2026-09-20 · **Status:** accepted

Hypertube supports login via 42 (mandatory) and GitHub (the subject's free
second-provider choice), alongside email+password. Each OAuth identity is
tracked in a dedicated `oauth_account` table rather than folded into
`User`, and auto-linked to a local account by email only when the
provider vouches that email is verified.

## Why

- **Dedicated `oauth_account` table, not an email match on `User`.** A
  user can hold several OAuth identities (42 *and* GitHub on the same
  account), unique on `(provider, providerUserId)`. A plain email column
  on `User` couldn't represent "signed in with two different providers",
  and gives nothing to enforce that a given provider account is claimed
  by one local user only.
- **GitHub as the second provider.** The subject only mandates 42 + one
  free choice. GitHub was picked for its ubiquity among student/dev
  accounts, and because it needs no new dependency: `passport-oauth2`
  (already used for 42 - no maintained provider-specific package exists
  for either) handles it the same way.
- **Auto-link only on a verified email.** 42 always verifies the account's
  email at signup on the intra. GitHub's `/user` only exposes the
  profile's public address, with no verified flag, so the email always
  comes from the primary+verified row of `/user/emails` - and an email
  that isn't verified is never used to attach a new OAuth identity to an existing
  account: doing so would let an attacker who controls an unverified
  address on one provider claim someone else's account on another.
- **A shared `OAuthProfile` shape** (`provider`, `providerUserId`,
  `email`, `emailVerified`, `suggestedUsername`, `firstName`,
  `lastName`) that every strategy's `validate()` maps into, so
  `AuthService.resolveOAuthUser` stays provider-agnostic. A third provider
  costs one new strategy file, not a change to the linking logic.

## Consequences

- The email used for linking has to be normalized (trim+lowercase) the
  same way the password-login path already is - a provider returning
  different casing than a locally-registered account would otherwise
  dodge the case-insensitive match and create a duplicate account. Missed
  on the first pass, fixed once noticed.
- **Linking revokes the local password.** The verified-email rule covers
  the provider side only: local registration does not verify the email,
  so an attacker can pre-register a victim's address with a password of
  their own. When the real owner later signs in through a provider and is
  auto-linked to that account, the attacker would keep working
  credentials on it (account pre-hijacking). Linking to an account that
  has a password therefore sets that password to null, and the owner sets
  a new one through the reset flow (HYP-34). Tradeoff: a user who
  registered locally and then signs in through a provider loses the
  password they chose. Acceptable until email verification exists
  (HYP-32); once registration verifies the address, this revocation can
  be dropped.
- Two concurrent callbacks for a never-before-seen provider account can
  both pass the "not linked yet" check and race to create the same
  `(provider, providerUserId)` row. The database's unique constraint is
  the source of truth; the loser recovers by re-reading the link the
  winner created and signs in through it, rather than surfacing the
  unique-violation 409 to what is, from the user's side, a successful
  login.
- **Token handoff after an OAuth callback is decided but not built yet:**
  a single-use exchange code, not a JWT placed directly in a redirect
  URL (which would leak it into browser history and server logs). Both
  callback routes currently return the JWT as the response body, which
  is enough to verify the round-trip by hand but not what a real browser
  redirect back to the SPA needs. Needs its own ticket before an OAuth
  login button is wired into the frontend.
- `GET /auth/<provider>/login` and `.../callback` are unauthenticated by
  necessity (`@Public()`) - they are the entry and exit of the handshake
  itself, not a protected resource.

## Amendment 2026-10-02: login CSRF (`state`) and the exchange code (HYP-53)

### `state`: bind it to the browser, not just sign it

Neither strategy sets `state` or `pkce`, so the callback verifies nothing
about who started the flow. Login CSRF: an attacker starts the flow
themselves, authenticates at the provider, and sends the victim the
callback URL (`?code=...`); the victim's browser completes it and is
logged into the attacker's account.

`state: true` in `passport-oauth2` needs a server-side session, and the
project is stateless (JWT). The obvious stateless answer, a signed
`state` value, is **not enough on its own**: the attacker can obtain a
validly signed `state` from our own `/login` and replay it in the
victim's callback URL. The signature proves we issued it, not that this
browser did. The value has to be tied to the user agent that started the
flow, which means a cookie.

Options considered:

- **Nonce cookie + matching `state`** (chosen). `/login` generates a
  random nonce, sets it in a short-lived cookie and sends the same value as
  `state`. The callback accepts only if cookie and `state` match, then
  clears the cookie. Stateless on the server, no session store. The
  attacker cannot set a cookie in the victim's browser, so a replayed
  callback URL fails.
- **PKCE (`pkce: true`).** Binds the code to the client that started the
  flow, but the `code_verifier` must live somewhere between `/login` and
  `/callback`: a cookie again (or a store). Same cookie cost for a
  smaller win here, since `state` is what closes login CSRF. Can be added
  later on top without redoing this.
- **Signed `state` without a cookie.** Rejected, see above.

Cookie attributes: `HttpOnly`, `SameSite=Lax` (the callback is a
top-level GET navigation from the provider, which Lax sends), `Secure`
outside dev, `Path=/auth`, `Max-Age` about 10 minutes, cleared on the
callback whether it succeeds or not. Implemented as a custom `store`
option on both strategies (to confirm against the `passport-oauth2`
source when coding: the `store` / `verify` callback signatures), so
`state` handling stays out of the controller. Needs cookie parsing
(`cookie-parser`, or reading the `Cookie` header by hand).

### Exchange code

Replaces the JWT-in-the-body response, as decided above:

- The callback (after the `state` check) mints a random single-use code
  (32 bytes, base64url) and redirects to
  `FRONTEND_ORIGIN/oauth/callback?code=...`. The JWT never appears in a
  URL.
- Codes live in an in-memory `Map<code, { userId, expiresAt }>`: single
  instance, same reasoning as the rate limiter, no Redis. It holds the
  user id, not a JWT, so the real token is minted only at exchange time.
- TTL: 60 seconds. Deleted on first use, and expired entries are swept
  on access.
- `POST /auth/oauth/exchange` with `{ code }`, `@Public()` and throttled
  like `/auth/login`, answers `{ access_token }` or 401 for an unknown,
  used or expired code (same answer for all three).

### Consequences

- Restarting the backend invalidates in-flight codes: the user retries
  the login. Acceptable at this scale, to revisit with the first
  multi-instance deploy.
- A cookie now exists in the auth flow even though sessions are JWT in
  `localStorage`. It carries no identity, only a one-shot nonce, and
  should not be mistaken for session state.
