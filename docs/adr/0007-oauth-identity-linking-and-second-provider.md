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
  `email`, `suggestedUsername`, `firstName`, `lastName`) that every strategy's `validate()` maps into, so
  `AuthService.resolveOAuthUser` stays provider-agnostic. A third provider
  costs one new strategy file, not a change to the linking logic.

## Consequences

- The email used for linking has to be normalized (trim+lowercase) the
  same way the password-login path already is - a provider returning
  different casing than a locally-registered account would otherwise
  dodge the case-insensitive match and create a duplicate account. Missed
  on the first pass, fixed once noticed.
- **Linking revokes the local password** (widened by the 2026-10-25 HYP-84
  amendment: linking now claims any unverified account). The verified-email rule covers
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
  winner created (since 2026-10-25, through a rerun of the whole
  resolution) and signs in through it, rather than surfacing the
  unique-violation 409 to what is, from the user's side, a successful
  login.
  The user-creation step just before it is covered too, see the
  2026-10-25 amendment.
- **Token handoff after an OAuth callback:** a single-use exchange code,
  not a JWT placed directly in a redirect URL (which would leak it into
  browser history and server logs). Built in HYP-53, see the amendment
  below. The first version of both callbacks returned the JWT as the
  response body, enough to verify the round-trip by hand but not what a
  real browser redirect back to the SPA needs.
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
in production only, `Path=/auth`, `Max-Age` about 10 minutes, cleared on the
callback that carries a `code`, whether the check passes or not. When the
provider redirects back with `?error=...` (consent denied), Passport stops
before checking the state, so the store never runs; `OAuthCallbackFilter`
expires the cookie on its failure redirect instead (see the amendment
below). Implemented as `CookieStateStore`,
passed as the `store` option of both strategies, so `state` handling
stays out of the controller. The cookie is read from the `Cookie` header
by hand: one cookie, so no `cookie-parser` dependency or middleware. The
store carries the overloads `passport-oauth2`'s `StateStore` type
requires; at runtime Passport picks one call shape from the method's
arity.

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
  each time a new code is issued (no timer).
- `POST /auth/oauth/exchange` with `{ code }`, `@Public()` and throttled
  (10 per minute, against 5 for `/auth/login`), answers
  `{ access_token }` or 401 for an unknown, used or expired code (same
  answer for all three).

### Consequences

- Restarting the backend invalidates in-flight codes: the user retries
  the login. Acceptable at this scale, to revisit with the first
  multi-instance deploy.
- A rejected callback (missing or mismatched `state`) first answered a
  plain 401 JSON body (Passport reports 403, Nest's `AuthGuard` turns any
  failure into 401). Since HYP-57 every callback failure redirects to the
  SPA instead, see the amendment below.
- A cookie now exists in the auth flow even though sessions are JWT in
  `localStorage`. It carries no identity, only a one-shot nonce, and
  should not be mistaken for session state.

## Amendment 2026-10-09: failed callbacks redirect to the SPA (HYP-57)

Supersedes the "plain 401 JSON body" consequence above. Both callback
routes carry `@OAuthCallback(provider)`, which adds `OAuthCallbackFilter`:
any failure on the callback (declined consent, missing or forged `state`,
no verified email, provider or DB error) redirects to
`FRONTEND_ORIGIN/oauth/callback?error=<reason>` instead of answering JSON
on the backend origin. The callback is a top-level navigation, so a JSON
error would strand the user on a bare `{"statusCode":401}` page.

- Three reasons only: `cancelled` (the provider sent
  `?error=access_denied`), `email_unverified` (`UnverifiedEmailException`,
  the one failure the user can fix at the provider), `failed` for
  everything else. Details stay in the server log, never in a URL.
- Logging: 5xx and non-HTTP errors as errors, an unverified email as a
  warning, other 4xx (declined consent, bad `state`) not at all.
- The failure redirect also expires the `oauth_state` cookie: a declined
  consent fails before `CookieStateStore.verify()` runs, so without this
  the nonce would stay live for its full 10 minutes.
- Success and failure redirects both carry `Referrer-Policy: no-referrer`:
  the callback URL holds the provider's `code` and `state`. The filter
  sets it itself, since a decorator `@Header` is not applied once the
  guard or handler has thrown.

## Amendment 2026-10-23: the state cookie behind the edge proxy (HYP-71)

Supersedes `Path=/auth` and "`Secure` in production only" above. Behind the
edge proxy (ADR-0009) the browser reaches the auth routes under `/api`
(`/api/auth/42/callback`), which nginx strips before Nest sees them. A cookie
set with `Path=/auth` is never sent back to a path under `/api/auth`, so the
state check would fail on every login.

- The Path follows what the browser sees: the proxy sets
  `X-Forwarded-Prefix: /api`, the cookie gets `Path=/api/auth`, and it is
  cleared with the same path. Without the header (direct backend, host dev)
  it stays `/auth`. Only a plain path (`/a/b-c`) is accepted from the header,
  since the value ends up in `Set-Cookie`.
- The cookie is `Secure` in production and whenever the request reached the
  backend over HTTPS (`req.secure`, which `trust proxy` derives from
  `X-Forwarded-Proto`), so a dev stack behind the TLS proxy gets it too.
- The callback URLs registered at the providers are the proxy's HTTPS ones,
  and `FRONTEND_ORIGIN` is the proxy's origin, where the SPA callback page is.

## Amendment 2026-10-25: the verified-email rule lives in the strategies, and a lost user-creation race runs again (HYP-55)

- **`OAuthProfile.emailVerified` is gone.** Both strategies set it to `true`
  (42 always verifies, GitHub keeps only the primary+verified row), so the
  "unverified: create without matching" branch of `resolveOAuthUser` could
  not run, and would have answered 409 on an existing email if it ever had.
  The rule above is unchanged, but it is now the strategies' contract:
  `OAuthProfile.email` is always provider-verified, and a strategy that has
  none refuses the login with `UnverifiedEmailException`. A new provider
  (HYP-20) must do the same.
- **A unique violation runs the whole resolution once more.** Two first
  logins for the same provider account (a double-click), or one racing a
  local registration of the same address or a sign-up taking the same
  username, can both read "no link, no user" before either inserts; the
  loser's user insert then hits the `email` or `username` constraint. The
  rerun sees what the winner committed: its link (that user), its user by
  email (linked, with any local password revoked first, as above), or a
  free username. A lost race on the link insert takes the same rerun,
  which finds the winner's link. A second violation is rethrown and
  becomes the 409.

## Amendment 2026-10-25: linking claims an unverified account (HYP-84)

Supersedes "Linking revokes the local password" above. `PATCH /users/:id` now
accepts a new email (the subject's API documents it), unverified until HYP-39.
That opened a variant the password revocation did not cover: an attacker signs
up through their own GitHub (no password), changes the account's email to the
victim's, and when the victim signs in with 42 the identity is linked into an
account the attacker still enters through GitHub.

- `User.emailVerified`: `true` for an account created or linked through a
  provider, `false` after a local registration or an email change. Existing
  accounts are verified when they have an OAuth link (migration).
- Auto-linking to an **unverified** account claims it first, before the link:
  the password is removed, every refresh-token family is revoked, the other
  provider links are deleted, and the email is marked verified. The holder of
  the verified email ends up the only way in, which also closes the original
  variant's surviving sessions (a pre-registered password's sessions used to
  outlive the revocation).
- Auto-linking to a **verified** account keeps the plain link: a provider
  already vouched for that email, so its password and sessions stay.
- The claimed account has no password, and an account without one cannot
  change its email or password through `PATCH /users/:id` (400): an access
  token still alive after the claim cannot set credentials on it. What such a
  token can still do for up to 15 minutes is edit the profile or delete the
  account, the access-token limit ADR-0011 already accepts.
- The cost for a legitimate user: changing one's email, then signing in with
  a provider at the new address, claims one's own account (password, sessions
  and other links revoked). The password reset sets a new password.
- A completed password reset (HYP-34) proves ownership of the email the same
  way, and must claim the account too.
