# OAuth identity linking, GitHub as the second provider

**Date:** 2026-09-20 · **Revised:** 2026-11-01 (HYP-53, HYP-57, HYP-71,
HYP-55, HYP-84, HYP-143) · **Status:** accepted

Hypertube supports login via 42 (mandatory) and GitHub (the subject's free
second-provider choice), alongside email+password. Each OAuth identity is a
row of a dedicated `oauth_account` table, auto-linked to a local account by
email only when the provider vouches that the email is verified. The
handshake is protected against login CSRF by a nonce cookie, and the SPA
receives its token through a single-use exchange code, never a URL.

## Why

- **Dedicated `oauth_account` table, not an email match on `User`.** A user
  can hold several OAuth identities (42 *and* GitHub), unique on
  `(provider, providerUserId)`. A column on `User` could not represent two
  providers, nor enforce that one provider account belongs to one local user.
- **GitHub as the second provider.** Ubiquitous among student and developer
  accounts, and no new dependency: `passport-oauth2` (already used for 42;
  no maintained provider-specific package exists for either) handles both.
- **Auto-link only on a verified email.** 42 verifies the email at signup.
  GitHub's `/user` exposes only the public address with no verified flag, so
  the email comes from the primary+verified row of `/user/emails`. Linking on
  an unverified address would let an attacker who controls it on one provider
  take over someone's account on another. This is the strategies' contract:
  `OAuthProfile.email` is always provider-verified, and a strategy that has
  none refuses the login with `UnverifiedEmailException`. A new provider
  (HYP-20) must do the same.
- **A shared `OAuthProfile` shape** (`provider`, `providerUserId`, `email`,
  `suggestedUsername`, `firstName`, `lastName`) that every strategy's
  `validate()` maps into, so `AuthService.resolveOAuthUser` stays
  provider-agnostic: a third provider costs one strategy file.

## Login CSRF: a nonce cookie bound to `state`

Without `state`, an attacker can authenticate at the provider and send the
victim the callback URL; the victim's browser completes it and is logged
into the attacker's account. `state: true` in `passport-oauth2` needs a
server-side session, and a signed `state` alone is not enough: the attacker
can fetch a validly signed one from our own `/login` and replay it. The
value must be tied to the browser that started the flow.

- **Chosen: nonce cookie + matching `state`** (`CookieStateStore`, the
  `store` option of both strategies). `/login` sets a random nonce in a
  short-lived cookie and sends the same value as `state`; the callback
  accepts only if they match. No session store, and an attacker cannot set
  a cookie in the victim's browser.
- **PKCE** was not taken: its `code_verifier` needs the same cookie for a
  smaller gain, since `state` is what closes login CSRF. It can be added on
  top later.
- Cookie attributes: `HttpOnly`, `SameSite=Lax` (the callback is a top-level
  GET from the provider), `Max-Age` about 10 minutes. `Secure` in production
  and whenever the request came over HTTPS (`req.secure`, derived from
  `X-Forwarded-Proto` by `trust proxy`). The `Path` follows what the browser
  sees: `/api/auth` behind the edge proxy (from `X-Forwarded-Prefix`, ADR-0009;
  only a plain path is accepted from that header, since it ends up in
  `Set-Cookie`), `/auth` without it.
- The cookie is cleared on the callback that carries a `code`, pass or fail,
  and by the failure redirect below (a declined consent fails before the
  store runs). It is read from the `Cookie` header by hand: one cookie, no
  `cookie-parser`.

## Token handoff: a single-use exchange code

The callback is a server-side redirect, so the SPA cannot receive a JSON
body, and a JWT in a redirect URL would leak into history and logs.

- After the `state` check, the callback mints a random code (32 bytes,
  base64url) and redirects to `FRONTEND_ORIGIN/oauth/callback?code=...`.
- Codes live in an in-memory map of user id and expiry (single instance, same
  reasoning as the rate limiter): 60 second TTL, deleted on first use,
  expired entries swept when a new one is issued. The JWT is minted only at
  exchange time.
- `POST /auth/oauth/exchange` with `{ code }` is `@Public()`, throttled
  (10 per minute, against 5 for `/auth/login`), and answers
  `{ access_token }` plus the refresh cookie (ADR-0011), or the same 401 for
  an unknown, used or expired code.
- Success and failure redirects carry `Referrer-Policy: no-referrer`, since
  the callback URL holds the provider's `code` and `state`.

## Failed callbacks redirect to the SPA

Both callbacks carry `@OAuthCallback(provider)`, which adds
`OAuthCallbackFilter`: any failure (declined consent, missing or forged
`state`, no verified email, provider or database error) redirects to
`FRONTEND_ORIGIN/oauth/callback?error=<reason>`, since a JSON error would
strand the user on a bare backend page.

- Three reasons only: `cancelled` (the provider sent `access_denied`),
  `email_unverified` (the one failure the user can fix at the provider),
  `failed` for everything else. Details stay in the server log, never in a
  URL.
- Logging: 5xx and non-HTTP errors as errors, an unverified email as a
  warning, other 4xx not at all.
- The filter sets `Referrer-Policy` itself, since a `@Header` decorator is
  not applied once the guard or handler has thrown.

## Linking to an existing account

Local registration and an email change through `PATCH /users/:id` do not
verify the address (until HYP-32 / HYP-39). That opens account
pre-hijacking: an attacker registers or changes an account to the victim's
email, and keeps a way in after the victim signs in through a provider and
is auto-linked to it.

- `User.emailVerified` is `true` for an account created or linked through a
  provider, `false` after a local registration or an email change.
- Auto-linking to an **unverified** account claims it first: the password
  is removed, every refresh-token family is revoked, every API key
  (ADR-0015) and the other provider links are deleted, and the email is
  marked verified. The holder of the
  verified email ends up the only way in. The claim runs before the link,
  so a failure between the two leaves the account claimed and unlinked (the
  next login links it), never linked with the old access intact.
- Auto-linking to a **verified** account is a plain link: a provider already
  vouched for that email, so its password and sessions stay.
- A claimed account has no password, and an account without one cannot
  change its email or password through `PATCH /users/:id` (400), so an access
  token alive at the claim cannot set credentials on it. It can still edit
  the profile or delete the account for up to 15 minutes, the access-token
  limit ADR-0011 accepts.
- A completed password reset (HYP-34) proves ownership of the email the same
  way, and must claim the account too.

## Consequences

- The linking email is normalized (trim + lowercase) like the password-login
  path, or a provider's different casing would create a duplicate account.
- **Concurrent first logins.** Two callbacks for the same new provider
  account (a double-click), or one racing a local registration of the same
  address or a sign-up taking the same username, can all read "no link, no
  user". The database constraints decide: a unique violation reruns the
  whole resolution once, which then finds the winner's link, its user by
  email (claimed if unverified, as above), or a free username. A second
  violation is rethrown and becomes the 409.
- The cost for a legitimate user: registering locally (or changing one's
  email) then signing in with a provider at that address claims one's own
  account (password, sessions and other links revoked). The password reset
  sets a new password.
- A backend restart drops in-flight exchange codes: the user retries the
  login. To revisit with a multi-instance deploy.
- The `oauth_state` cookie carries no identity, only a one-shot nonce; it is
  not session state.
- `GET /auth/<provider>/login` and `.../callback` are `@Public()` by
  necessity: they are the handshake itself. The callback URLs registered at
  the providers are the proxy's HTTPS ones, and `FRONTEND_ORIGIN` is the
  proxy's origin.
