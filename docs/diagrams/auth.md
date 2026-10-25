# Auth domain

How an account is created, how a browser gets a token (password or 42 /
GitHub), and how that token guards every other route. Start with the
overview, then open the detail that matches the code you are touching.

Decisions behind it: [ADR-0001](../adr/0001-hash-passwords-with-argon2id.md)
/ [ADR-0004](../adr/0004-pin-argon2id-cost-parameters.md) (argon2id),
[ADR-0002](../adr/0002-jwt-bearer-tokens-for-authentication.md) (JWT bearer),
[ADR-0006](../adr/0006-frontend-architecture.md) (frontend state),
[ADR-0007](../adr/0007-oauth-identity-linking-and-second-provider.md) (OAuth),
[ADR-0011](../adr/0011-rotating-refresh-tokens-in-an-httponly-cookie.md) (refresh tokens, logout).
The backend legs are also drawn as one poster in
[`auth-flow.png`](auth-flow.png), and the logout alone in
[`auth-logout.png`](auth-logout.png) (Excalidraw sources next to them).

## Overview

```mermaid
flowchart TD
    reg["SPA - register page"] --> postUsers["API - POST /users<br/>argon2id hash"]
    postUsers -- "201, then log in" --> login["SPA - login page"]
    login --> postLogin["API - POST /auth/login"]

    btns["SPA - 42 / GitHub buttons"] --> oLogin["API - GET /auth/:provider/login<br/>sets the state cookie"]
    oLogin --> prov["42 / GitHub<br/>user consents"]
    prov --> oCb["API - GET /auth/:provider/callback<br/>state check, find / link / create"]
    oCb -- "302 ?code= (or ?error=)" --> cbpage["SPA - /oauth/callback page"]
    cbpage --> exch["API - POST /auth/oauth/exchange"]

    postLogin -- "access_token" --> token[("SPA - token in memory")]
    exch -- "access_token" --> token
    token -- "Authorization: Bearer" --> jwt["API - JwtAuthGuard (global)<br/>+ ownership check on writes"]
    jwt --> routes["every other route"]
    token -. "page load, or a 401" .-> refresh["API - POST /auth/refresh<br/>cookie in, new access token<br/>and next cookie out"]
    refresh -- "access_token" --> token

    out["SPA - logout button"] --> postLogout["API - POST /auth/logout<br/>revokes the session, 204"]
    out -- "discarded" --> token

    classDef spa fill:#dbeafe,stroke:#2563eb,color:#1e3a8a
    classDef api fill:#ede9fe,stroke:#7c3aed,color:#3b0764
    classDef ext fill:#f3f4f6,stroke:#6b7280,color:#111827
    class reg,login,btns,cbpage,token,out spa
    class postUsers,postLogin,oLogin,oCb,exch,jwt,postLogout,refresh api
    class prov,routes ext
```

Blue: the SPA (`frontend/src/features/auth`). Violet: the backend
(`backend/src/auth`, `backend/src/users`). Grey: outside both.

What the overview hides, each covered below or in the ADRs: rate limits
(`security-checklist.md` section 7), the uniform 401 on login, the 403 on
another user's row, the SPA's session states and `RequireAuth` (section 2),
how the SPA keeps the session across a reload and a 401 (section 8), changing
the email or the password (section 9).

## 1. Register, frontend side (HYP-46)

The SPA never logs in on its own after a registration: a fresh account
always goes through the real login once.

```mermaid
flowchart TD
    A["User submits the register form"] --> B{"validateRegister()<br/>passes?"}
    B -- no --> C["Field errors shown<br/>nothing sent to the backend"]
    B -- yes --> D["POST /users"]
    D --> E{Response}
    E -- "409 duplicate" --> F["Generic conflict message<br/>no field named"]
    E -- "201 created" --> G["Redirect to /login<br/>('account created' notice)"]
    G --> H["User logs in"]
    H --> I["POST /auth/login"]
    I --> J["Redirect to /, token stored"]
```

## 2. Session states in the SPA (HYP-45)

`authReducer` (`auth-reducer.ts`): three states, five events. The events
that land on the same state stay distinct so a feature can react to the
cause (e.g. a "session expired" notice).

```mermaid
stateDiagram-v2
    [*] --> loading
    loading --> authenticated: bootstrap-success<br/>(POST /auth/refresh + GET /users/me ok)
    loading --> anonymous: bootstrap-anonymous<br/>(no session cookie, or a 4xx)
    anonymous --> authenticated: login-success<br/>(password login or OAuth code exchange)
    authenticated --> anonymous: logout<br/>(POST /auth/logout best effort,<br/>token + query cache cleared)
    authenticated --> anonymous: session-expired<br/>(a 401 the refresh could not save)
```

`RequireAuth` renders nothing while `loading`, its children when
`authenticated`, and redirects to `/login` when `anonymous`. The bootstrap
events only apply from `loading`: a startup check that settles after a login
is dropped.

## 3. OAuth handshake (HYP-11, HYP-53, HYP-57)

The JWT never appears in a URL: the callback hands the SPA a single-use
code, traded for the token by a `POST`.

```mermaid
sequenceDiagram
    participant B as Browser
    participant A as Backend
    participant P as Provider (42 / GitHub)
    B->>A: GET /auth/42/login
    A-->>B: 302 to provider, state=N, Set-Cookie oauth_state=N
    B->>P: authorize (state=N)
    P-->>B: 302 /auth/42/callback?code&state=N
    B->>A: GET callback (cookie N)
    alt state equals cookie, profile resolved
        A->>P: trade code, fetch profile
        A-->>B: 302 FRONTEND_ORIGIN/oauth/callback?code=C
        B->>A: POST /auth/oauth/exchange {code: C}
        A-->>B: { access_token } (unknown / used / expired code: 401)
    else any failure
        A-->>B: 302 FRONTEND_ORIGIN/oauth/callback?error=cancelled | email_unverified | failed
    end
    Note over A,B: every callback redirect carries Referrer-Policy: no-referrer<br/>and expires the oauth_state cookie, whether the callback passed or failed
```

## 4. OAuth identity linking (HYP-11)

`AuthService.resolveOAuthUser`: which local account a provider identity
signs into. The strategy has already refused a profile without a
provider-verified email (`UnverifiedEmailException`), so matching by email is
safe.

```mermaid
flowchart TD
    A["GET /auth/{42,github}/callback"] --> B["Strategy.validate() -> OAuthProfile"]
    B --> C{"(provider, providerUserId)<br/>already linked?"}
    C -- yes --> L["sign in as that user<br/>(exchange code, see 3)"]
    C -- no --> E{"local user with<br/>this email?"}
    E -- yes --> V{"its email<br/>verified?"}
    V -- yes --> G["link identity to that user"]
    V -- no --> K["claim it first: drop the password,<br/>revoke every session and the other links,<br/>mark the email verified"]
    K --> G
    E -- no --> F["create a new user"]
    F --> H["link identity to the new user"]
    G --> L
    H --> L
    F & G & H -. "unique violation" .-> C2["another request inserted first:<br/>run the resolution once more<br/>(a second violation is a 409)"]
    C2 --> C
```

An account's email is verified when a provider vouched for it: created or
linked through OAuth. A local registration or an email change leaves it
unverified, and the next provider sign-in with that email claims the account
for its verified owner (ADR-0007, amendment 2026-10-25).

## 5. OAuth callback page, frontend side (HYP-57)

`auth-oauth-callback-page.tsx`: where section 3 hands the browser back to
the SPA. The code is removed from the URL before it is exchanged, and only
one exchange runs even under StrictMode's double effect. The exchange waits
for the startup bootstrap (section 8) to settle: a refresh that fails clears
the cookie, and landing after the exchange it would wipe the new session's. A success goes
through the same `login-success` event as a password login (section 2).

```mermaid
flowchart TD
    A["Browser lands on /oauth/callback<br/>(302 from the backend, section 3)"] --> B{"Query string?"}
    B -- "?error=cancelled" --> EC["'Sign-in was cancelled.'"]
    B -- "?error=email_unverified" --> EU["'Your GitHub account has no<br/>verified email address...'"]
    B -- "?error=failed, unknown reason,<br/>or neither code nor error" --> EF["'Sign-in failed. Please try again.'"]
    B -- "?code=C" --> S["navigate(replace) to /oauth/callback<br/>code stripped from the URL"]
    S --> W["wait for the startup bootstrap<br/>(auth state leaves loading)"]
    W --> X["loginWithOAuthCode(C)<br/>POST /auth/oauth/exchange, store the token,<br/>then GET /users/me"]
    X --> R{Outcome}
    R -- "401 (unknown / used / expired code)" --> EX["'This sign-in link has expired.'"]
    R -- "any other error<br/>(token rolled back)" --> EF
    R -- "ok" --> OK["dispatch login-success<br/>redirect to /"]
    EC --> BACK["'Back to sign in' link to /login"]
    EU --> BACK
    EF --> BACK
    EX --> BACK
```

The page also sets `<meta name="referrer" content="no-referrer">`, and
the error messages are translation keys (`oauthCallback.errors.<code>`),
with the English and French texts in `auth-locale-en.ts` / `auth-locale-fr.ts`
(HYP-56).

## 6. Staying logged in: refresh and rotation (HYP-77)

Login and the OAuth exchange hand out two things: the access token in the body
(15 minutes) and a **refresh token in an `HttpOnly` cookie** (7 days, 30 at
most). When the access token expires, `POST /auth/refresh` trades the cookie for
a new access token **and the next cookie**: each refresh token works once.

```mermaid
flowchart TD
    A["POST /auth/refresh<br/>(cookie only, no Bearer)"] --> N{"cookie sent?"}
    N -- no --> Z["204, no body<br/>(no session: a signed-out visitor)"]
    N -- yes --> B{"token known, alive,<br/>not revoked?"}
    B -- no --> X["401 + clear the cookie"]
    B -- yes --> C{"already used?"}
    C -- "no" --> OK["mark it used, issue the next one<br/>200 + new access token + new cookie"]
    C -- "yes, under 10 s ago<br/>(two tabs, a retry)" --> OK
    C -- "yes, longer ago<br/>= a copy was stolen" --> R["revoke the whole session<br/>401 (the legitimate holder too)"]
```

Only the token's SHA-256 is stored, grouped by session (`familyId`). The SPA
side is section 8.

## 7. Logout (HYP-35, HYP-77)

`POST /auth/logout` is public and driven by the cookie, so it works with an
expired access token: it revokes the whole session, clears the cookie and
answers 204, even when there is nothing to revoke. The SPA calls it best effort
and signs out locally whatever the answer.

```mermaid
sequenceDiagram
    participant U as User
    participant S as SPA (AuthProvider)
    participant A as Backend
    U->>S: click "Log out"
    S->>A: POST /auth/logout (the browser adds the refresh cookie)
    Note over S: no await, the answer is ignored
    S->>S: remove token, clear query cache
    S->>S: dispatch logout (state: anonymous)
    A->>A: revoke the session of the cookie token
    A-->>S: 204 + clear the cookie (or an error, dropped)
    S-->>U: RequireAuth redirects to /login
```

An access token copied before logout still works until it expires (15 minutes),
but nothing can renew it. Listed in
[`known-limitations.md`](../defense/known-limitations.md).

## 8. The SPA keeps the session (HYP-78)

The access token lives in a module variable (`lib/token.ts`), never in
`localStorage`, so a script cannot read it and a reload loses it. The refresh
cookie brings it back: on load, `restoreSession` (`auth-queries.ts`) calls
`POST /auth/refresh` then `GET /users/me`. Mid-session, `apiFetch` answers a
401 by refreshing once and retrying the request.

```mermaid
sequenceDiagram
    participant C as Caller (query, page)
    participant F as apiFetch
    participant A as Backend
    C->>F: GET /users/me
    F->>A: Bearer (expired)
    A-->>F: 401
    alt token changed since the request left (a login, a refresh)
        F->>A: retry with the current token
    else same token
        F->>A: POST /auth/refresh (shared by every 401 in flight)
        A-->>F: 200 new access token + next cookie
        F->>A: retry with the new token
    end
    A-->>F: 200
    F-->>C: data
    Note over F,C: refresh 401: the token is dropped, the 401 reaches the<br/>query cache net, AuthProvider dispatches session-expired
```

- **One refresh at a time.** Parallel 401s, and the two bootstrap runs of
  StrictMode in dev, share the refresh in flight: each rotation consumes the
  cookie, so a second one would present a used token.
- **A newer token wins.** A refresh that lands after a login or a logout does
  not overwrite what they set. The 401 net ends the session only when no token
  is left, so a 401 answered to a replaced token leaves the new session alone.
- **Login and logout wait for the refresh in flight.** A failed refresh clears
  the cookie; landing after a login it would wipe the new session's cookie,
  and a logout must revoke the cookie the refresh rotates in.
- **The auth routes are never retried**: their 401 is the answer (bad
  credentials, a dead cookie).

## 9. Changing the email or the password (HYP-84)

`PATCH /users/:id` takes the subject's username, email, password and profile
picture URL, on one's own profile only (403 otherwise). An email or password
change re-authenticates and ends every other session.

```mermaid
flowchart TD
    A["PATCH /users/:id"] --> O{"own profile?"}
    O -- no --> X403["403"]
    O -- yes --> C{"email or password<br/>changes?"}
    C -- no --> S["save"] --> R200["200"]
    C -- yes --> P{"account has<br/>a password?"}
    P -- "no (OAuth-only, or claimed)" --> X400a["400: set one through<br/>the password reset"]
    P -- yes --> Q{"currentPassword?"}
    Q -- missing --> X400["400"]
    Q -- wrong --> X403b["403"]
    Q -- right --> H["hash a new password,<br/>mark a new email unverified"]
    H --> S2{"save: email taken?"}
    S2 -- yes --> X409["409, nothing revoked"]
    S2 -- no --> V["revoke every refresh-token family,<br/>issue a new one for the caller"]
    V --> R200b["200 + new refresh cookie"]
```

- The email is compared normalised: sending the current one back is no change.
- An account without a password cannot change either: an access token still
  alive after a claim (section 4) would otherwise set a password on the
  account its owner just took back. It sets one through the password reset,
  which proves it owns the email (HYP-34).
- A wrong `currentPassword` is a 403, not a 401: the request is refused, the
  session stays, and the SPA does not refresh for nothing.
- The route is throttled (10 per minute), since it checks a password.
- The caller's own cookie never reaches `/users` (it is scoped to the auth
  routes), hence "revoke all, then issue one" rather than "all but this one".
