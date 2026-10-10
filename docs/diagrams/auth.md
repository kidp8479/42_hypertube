# Auth domain

How an account is created, how a browser gets a token (password or 42 /
GitHub), and how that token guards every other route. Start with the
overview, then open the detail that matches the code you are touching.

Decisions behind it: [ADR-0001](../adr/0001-hash-passwords-with-argon2id.md)
/ [ADR-0004](../adr/0004-pin-argon2id-cost-parameters.md) (argon2id),
[ADR-0002](../adr/0002-jwt-bearer-tokens-for-authentication.md) (JWT bearer),
[ADR-0006](../adr/0006-frontend-architecture.md) (frontend state),
[ADR-0007](../adr/0007-oauth-identity-linking-and-second-provider.md) (OAuth).
The backend legs are also drawn as one poster in
[`auth-flow.png`](auth-flow.png) (Excalidraw source next to it).

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

    postLogin -- "access_token" --> token[("SPA - token in localStorage")]
    exch -- "access_token" --> token
    token -- "Authorization: Bearer" --> jwt["API - JwtAuthGuard (global)<br/>+ ownership check on writes"]
    jwt --> routes["every other route"]

    classDef spa fill:#dbeafe,stroke:#2563eb,color:#1e3a8a
    classDef api fill:#ede9fe,stroke:#7c3aed,color:#3b0764
    classDef ext fill:#f3f4f6,stroke:#6b7280,color:#111827
    class reg,login,btns,cbpage,token spa
    class postUsers,postLogin,oLogin,oCb,exch,jwt api
    class prov,routes ext
```

Blue: the SPA (`frontend/src/features/auth`). Violet: the backend
(`backend/src/auth`, `backend/src/users`). Grey: outside both.

What the overview hides, each covered below or in the ADRs: rate limits
(`security-checklist.md` section 7), the uniform 401 on login, the 403 on
another user's row, the SPA's session states and `RequireAuth` (section 2).

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
    loading --> authenticated: bootstrap-success<br/>(token + GET /users/me ok)
    loading --> anonymous: bootstrap-anonymous<br/>(no token, or /users/me 4xx)
    anonymous --> authenticated: login-success<br/>(password login or OAuth code exchange)
    authenticated --> anonymous: logout<br/>(token + query cache cleared)
    authenticated --> anonymous: session-expired<br/>(any 401 mid-session)
```

`RequireAuth` renders nothing while `loading`, its children when
`authenticated`, and redirects to `/login` when `anonymous`.

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
    Note over A,B: every callback redirect carries Referrer-Policy: no-referrer
```

## 4. OAuth identity linking (HYP-11)

`AuthService.resolveOAuthUser`: which local account a provider identity
signs into.

```mermaid
flowchart TD
    A["GET /auth/{42,github}/callback"] --> B["Strategy.validate() -> OAuthProfile"]
    B --> C{"(provider, providerUserId)<br/>already linked?"}
    C -- yes --> L["sign in as that user<br/>(exchange code, see 3)"]
    C -- no --> D{"email verified<br/>by the provider?"}
    D -- yes --> E{"local user with<br/>this email?"}
    D -- no --> F["create a new user"]
    E -- yes --> G["link identity to that user;<br/>revoke its local password"]
    E -- no --> F
    F --> H["link identity to the new user"]
    G --> L
    H --> L
    H -. "unique violation<br/>(concurrent callback)" .-> R["re-read the winner's link"]
    R --> L
    F -. "unique violation on email / username<br/>(concurrent first login) - not handled yet, HYP-55" .-> X["409 or orphan user"]
```

## 5. OAuth callback page, frontend side (HYP-57)

`auth-oauth-callback-page.tsx`: where section 3 hands the browser back to
the SPA. The code is removed from the URL before it is exchanged, and only
one exchange runs even under StrictMode's double effect. The exchange waits
for the startup `/users/me` check: with a stale token in storage, its late
401 would otherwise wipe the fresh token. A success goes
through the same `login-success` event as a password login (section 2).

```mermaid
flowchart TD
    A["Browser lands on /oauth/callback<br/>(302 from the backend, section 3)"] --> B{"Query string?"}
    B -- "?error=cancelled" --> EC["'Sign-in was cancelled.'"]
    B -- "?error=email_unverified" --> EU["'Your GitHub account has no<br/>verified email address...'"]
    B -- "?error=failed, unknown reason,<br/>or neither code nor error" --> EF["'Sign-in failed. Please try again.'"]
    B -- "?code=C" --> S["navigate(replace) to /oauth/callback<br/>code stripped from the URL"]
    S --> W["wait for the startup /users/me check<br/>(auth state leaves loading)"]
    W --> X["loginWithOAuthCode(C)<br/>POST /auth/oauth/exchange, store the token,<br/>then GET /users/me"]
    X --> R{Outcome}
    R -- "401 (unknown / used / expired code)" --> EX["'This sign-in link has expired.'"]
    R -- "any other error<br/>(token rolled back)" --> EF
    R -- "ok" --> OK["dispatch login-success<br/>redirect to /"]
    EC --> BACK["'Back to log in' link to /login"]
    EU --> BACK
    EF --> BACK
    EX --> BACK
```

The page also sets `<meta name="referrer" content="no-referrer">`, and
the error messages all go through `describeOAuthError`, ready for i18n.
