# Traceability matrix

Every subject requirement, mapped to the issue that delivers it, the code
that satisfies it, and the test that proves it. Filled one row per feature
as it merges. This is the document that lets an evaluator tick their grid
without reading the codebase - and it is where the subject's hard
constraints live once `CLAUDE.md` is removed for the defense.

Sources: the subject (v7.1) and the evaluation scale (marking sheet), kept
in the git-ignored `pdf/` folder. The marking sheet is stricter than the
subject in places; a row says so when it is the source. Reconfirm both
against the intra before the final defense.

State: **done** / **partial** / **todo**.

The security rows below stay verdict-level. The mechanism-level view (every
control, its code path, its proof, and the accepted gaps) lives in
[`security-checklist.md`](security-checklist.md).

## Eliminatory constraints (0 non-negotiable if unmet)

| Constraint | Issue | Where handled | Proof | State |
|---|---|---|---|---|
| No plaintext passwords in DB | HYP-10 | `users.service.ts` hashes with argon2id before insert (`argon2.config.ts`, ADR-0001/0004) | `users.service.spec.ts` asserts stored value != plaintext and `argon2.verify` matches | done |
| No SQL injection possible | HYP-10 | TypeORM repository + parameterised query builders only; `:id` via `ParseIdPipe` | code review; no string concatenation with input anywhere | done |
| No HTML/JS injection | HYP-10 / HYP-45 / HYP-49 | backend returns JSON only; React auto-escapes; no `dangerouslySetInnerHTML`; CSP with no inline script on the built SPA and on `/api-docs`, helmet on the backend (ADR-0014) | `web-security-review` (HYP-10, HYP-45); `security-headers.config.spec.ts`; CI step "Check the prod SPA sends its Content-Security-Policy"; e2e suite and a violation sweep under the prod CSP | done |
| All forms and uploads validated | HYP-10 / HYP-38 | global `ValidationPipe` (`whitelist` + `forbidNonWhitelisted` + `transform`); class-validator DTOs; pictures: type from the first bytes, 2 MB cap, random stored name (`ProfilePictureStore`, ADR-0016) | DTO specs; `forbidNonWhitelisted` returns 400 on unknown fields; `profile-picture.store.spec.ts`, Bruno 57-62 | done |
| `.env` excluded from git, no secret committed | HYP-9 | `.gitignore`; `.env.example` with placeholders; `JWT_SECRET` placeholder rejected at boot | gitleaks secret scan in CI (`scan`, a required check on `main`) | done |
| No console error/warning (browser or server) during the defense | HYP-45 | clean-browser check on the auth flow; the only console line is the browser's own network log of a deliberate 401 | headless-Chromium walk in the HYP-45 PR; `docs/defense/known-limitations.md` | partial - re-check per feature |
| Torrent downloaded "by hand" (no streaming-from-torrent library); the evaluator asks which libraries are used | HYP-12 | n/a | n/a | todo |
| Legal, rights-free sources only; >= 2 external search sources | HYP-13 | n/a | n/a | todo |
| No HTTP 5xx response during the defense (marking sheet: graded Crash, like a console error) | HYP-16 | expected failures answer a 4xx; a search source that is down degrades to partial results, never a 502 / 504 | n/a | todo - re-check per feature |
| `AUTHORS` file at the repository root (marking sheet, preliminaries) | HYP-18 | `AUTHORS` | file present | done |

## Auth and users

| Requirement | Issue | Where handled | Proof | State |
|---|---|---|---|---|
| Registration asks for email, username, first name, last name and password | HYP-10 | `CreateUserDto`, `POST /users` | `users.service.spec.ts`, Bruno, `frontend/e2e/auth.spec.ts` | done |
| Profile picture at registration (marking sheet), upload validated, default avatar | HYP-38 | `POST /users` as multipart with a `picture` file (JPEG, PNG or WebP, 2 MB); none = the username's initial as default avatar (ADR-0016) | `profile-picture.controller.spec.ts`, `users.service.spec.ts`, Bruno 57-58, `auth-register-page.test.tsx`, `e2e/auth.spec.ts` | done |
| Password strength: a common French word is refused (marking sheet) | HYP-37 | n/a | n/a | todo |
| Edit my email, profile picture and information | HYP-84 / HYP-39 (API) / HYP-87 (page) | `PATCH /users/:id` (own profile only, 403 otherwise) takes username, email, password, first name, last name, language; the picture through `PUT` / `DELETE /users/:id/picture` (HYP-38); an email or password change needs `currentPassword` and ends the other sessions; verifying the new email: HYP-39 | `users.controller.spec.ts`, `users.controller.update.spec.ts`, `users.service.spec.ts`, Bruno 13, 37-44, 59-62; the `/profile` page: `users-profile-page.test.tsx`, `e2e/profile.spec.ts` | partial - the language is edited through the header picker (saved on the account); the email change is not verified yet (HYP-39) |
| View another user's profile: username and picture, never the email | HYP-80 (API) / HYP-87 (page) | `GET /users/:id` returns `PublicUserDto` to a non-owner; the owner also gets the email; the `/users/:id` page shows username and picture, and sends one's own id to `/profile` | `users.controller.fields.spec.ts`, Bruno, `users-public-profile-page.test.tsx`, `e2e/profile.spec.ts` | done |
| Log in with the username and password (III.1; the email works too), password hashed | HYP-10 / HYP-91 | `POST /users` (register), `POST /auth/login` takes an `identifier`: an email when it contains `@`, otherwise a username, matched whatever the case (`UsersService.findForLogin`); a username cannot contain `@` | `auth.service.spec.ts`, `users.service.spec.ts`, `users.controller.update.spec.ts`; Bruno 05-06 (email, then username in another case), 27 / 32; `frontend/e2e/auth.spec.ts` logs in with the username | done |
| OAuth "42 strategy" + >= 1 other provider | HYP-11 / HYP-53 / HYP-57 | `FortyTwoStrategy` + `GithubStrategy` (`auth/strategies/`), identity linking in `AuthService.resolveOAuthUser` (ADR-0007); callback -> single-use exchange code -> `POST /auth/oauth/exchange` | `fortytwo.strategy.spec.ts`, `github.strategy.spec.ts`, `auth.service.spec.ts`, `oauth-exchange.service.spec.ts`; Bruno 17-20; `frontend/e2e/oauth.spec.ts`; SPA side (`auth-oauth-buttons.tsx`, `/oauth/callback` page, HYP-57) in `auth-oauth-callback-page.test.tsx` | done |
| Reset password by email | HYP-34 (needs HYP-32 mail infra) | n/a | n/a | todo |
| One-click logout, from any page | HYP-35 / HYP-45 (frontend) / HYP-19 (header on every page) | the header's Log out button; `POST /auth/logout` (204, public, revokes the refresh-token session and clears the cookie, ADR-0011), then frontend `logout()` clears token + query cache -> guard redirects | `auth.session.spec.ts`, Bruno 33-34, `auth-provider.test.tsx` logout cases | done - the 15 minute access token still expires on its own, see `known-limitations.md` |
| Language choice, default English | HYP-36 / HYP-56 | `User.preferredLanguage` (`en` / `fr`, default `en`); frontend `react-i18next` with English as default and fallback, language resolved before the first render (account, then manual choice, then browser, then English), switcher saving to `localStorage` and to the account via `PATCH /users/:id` (`docs/diagrams/i18n.md`) | `lib/i18n.test.ts`, `lib/language.test.ts`, `language-switcher.test.tsx`, `language-sync.test.tsx`; the account side in `users.controller.update.spec.ts` (saved, 400 on an unsupported language) and Bruno 13 | done |
| `GET /users/me` current-user shortcut | HYP-44 | `UsersController.findMe` | unit + HTTP routing test | done |
| Frontend: router, API client, auth context, protected routes | HYP-45 | `src/features/auth/`, `src/lib/`, `RequireAuth` | Vitest specs under `frontend/src/`; ADR-0006 | done |
| Frontend: login + register pages | HYP-46 | `auth-login-page.tsx`, `auth-register-page.tsx` | jsdom unit tests + `frontend/e2e/auth.spec.ts` (Playwright, real browser, register -> login, a required `e2e` check in CI) | done |

## API (RESTful + OAuth2)

| Requirement | Issue | Where handled | Proof | State |
|---|---|---|---|---|
| `POST /oauth/token` (client + secret -> token) | HYP-122 | API keys per user (`api-clients/`), `OAuthTokenController`; the token acts as the key's owner (ADR-0015) | `oauth-token.*.spec.ts`, `api-clients.*.spec.ts`, Bruno 46 to 56 | done |
| Imposed endpoints (`/users`, `/users/:id`, `/movies`, `/movies/:id`, `/comments`, `/comments/:id`, `/movies/:movie_id/comments`) | HYP-15 | `/users`, `/users/:id` exist, and answer a token from `POST /oauth/token` like a login token | Bruno 52, 53 | partial |
| Correct HTTP codes (403 on editing another profile, etc.) | HYP-10 | `PATCH`/`DELETE /users/:id` -> 403 when `user.id !== :id` | HTTP-level guard tests | partial - full table in `rest-proof.md` (todo) |
| `GET /movies`, `GET /movies/:id` need a token (a user's, or a client-credentials token from `POST /oauth/token`): "any user" of III.4 is any API client holding a token, while the library stays for connected users | HYP-15 | default-deny `JwtAuthGuard`, no `@Public()` on movie data | n/a | todo |
| `PATCH` / `DELETE /comments/:id` are the author's only (403 otherwise); `PATCH` takes the documented `comment` and `username`; author and date of a new comment are set by the server | HYP-15 | n/a | n/a | todo |
| Extra route beyond the subject's list: `DELETE /users/:id` (own account only, 403 otherwise) | HYP-10 | `UsersController` | HTTP-level guard tests | done - listed in `rest-proof.md` (todo) |
| RESTful proof for the defense | HYP-40 | Swagger at `/api-docs`: request and response models with their validation rules (`@nestjs/swagger` plugin), bearer token required unless `@Public()`, error codes per route, "Try it out" through the proxy (`config/swagger.config.ts`) | Bruno 45 | partial - `rest-proof.md` todo (HYP-59) |

## Layout and compatibility

| Requirement | Issue | State |
|---|---|---|
| Header, main section and footer on every page; a newcomer finds register and search quickly | HYP-19 | partial - `AppLayout` frames every route (`app-layout.test.tsx`, `e2e/layout.spec.ts`); the login page links to register; search waits for the library (HYP-13) |
| Works on Firefox and Chrome (subject: latest versions; marking sheet: Firefox >= 41, Chrome >= 46) | HYP-19 | done for the latest versions - every Playwright spec runs in Playwright's Chromium and Firefox builds, locally and in CI; the marking-sheet minimums are below what Tailwind v4 supports (`known-limitations.md`); a manual pass in stock Firefox and Chrome before the defense |
| Usable on a phone and on small resolutions | HYP-19 | partial - `e2e/layout.spec.ts` checks the login and a signed-in page at 320 px, no sideways scroll; re-check with each new page |

## Video library and player

| Requirement | Issue | State |
|---|---|---|
| Library and video page reachable by connected users only | HYP-13 / HYP-14 | todo (`RequireAuth` exists) |
| Search queries >= 2 legal sources, keeps only videos, results sorted by name | HYP-13 | todo |
| Default view: most popular videos of the external sources, sorted by a named criterion | HYP-13 | todo |
| Thumbnail: name, year, rating, cover; watched and unwatched clearly different | HYP-13 | todo |
| Infinite scroll (no "next page" link); sort and filter by name, genre, rating, year | HYP-13 | todo |
| Video page: player, summary, cast, year, length, rating, cover; comments listed and posted | HYP-14 | todo |
| Background, non-blocking torrent download; stream starts before the download ends | HYP-12 / HYP-14 | todo |
| Magnet links: the marking sheet's mkv magnet (*TPB AFK*, Creative Commons) streams | HYP-12 / HYP-14 | todo |
| Downloaded file kept, never downloaded twice, deleted if unwatched for a month | HYP-14 | todo |
| English subtitles, plus the user's language when it differs from the video's, selectable in the player | HYP-14 | todo |
| On-the-fly conversion when the browser cannot play the file (mkv at least) | HYP-14 | todo |

## Notes

- The subject is dated (v7.1) - always reconfirm the exact wording on the
  intra before the final defense.
- Reconfirm the RNCP "Développement web et mobile" Web sub-category
  thresholds (min 15000 XP / min 2 projects) on meta.intra.42.fr before
  treating the certification as acquired.
