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
  email at signup on the intra. GitHub's `/user` can return a `null`
  email when it's kept private - resolved by falling back to the
  primary+verified row from `/user/emails` - and an email that isn't
  verified is never used to attach a new OAuth identity to an existing
  account: doing so would let an attacker who controls an unverified
  address on one provider claim someone else's account on another.
- **A shared `OAuthProfile` shape** (`provider`, `providerUserId`,
  `email`, `emailVerified`, `suggestedUsername`, `firstName`,
  `lastName`) that every strategy's `validate()` maps into, so
  `AuthService.loginWithOAuth` stays provider-agnostic. A third provider
  costs one new strategy file, not a change to the linking logic.

## Consequences

- The email used for linking has to be normalized (trim+lowercase) the
  same way the password-login path already is - a provider returning
  different casing than a locally-registered account would otherwise
  dodge the case-insensitive match and create a duplicate account. Missed
  on the first pass, fixed once noticed.
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
