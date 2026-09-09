# Traceability matrix

Every subject requirement, mapped to the issue that delivers it, the code
that satisfies it, and the test that proves it. Filled one row per feature
as it merges. This is the document that lets an evaluator tick their grid
without reading the codebase - and it is where the subject's hard
constraints live once `CLAUDE.md` is removed for the defense.

Source: `pdf/en.subject_hypertube.pdf` (v7.1) in the veille folder - reconfirm
against the intra before the final defense.

State: **done** / **partial** / **todo**.

## Eliminatory constraints (0 non-negotiable if unmet)

| Constraint | Issue | Where handled | Proof | State |
|---|---|---|---|---|
| No plaintext passwords in DB | HYP-10 | `users.service.ts` hashes with argon2id before insert (`argon2.config.ts`, ADR-0001/0004) | `users.service.spec.ts` asserts stored value != plaintext and `argon2.verify` matches | done |
| No SQL injection possible | HYP-10 | TypeORM repository + parameterised query builders only; `:id` via `ParseIntPipe` | code review; no string concatenation with input anywhere | done |
| No HTML/JS injection | HYP-10 / HYP-45 | backend returns JSON only; React auto-escapes; no `dangerouslySetInnerHTML` | `web-security-review` (HYP-10, HYP-45) | partial - CSP still todo (HYP-49) |
| All forms and uploads validated | HYP-10 | global `ValidationPipe` (`whitelist` + `forbidNonWhitelisted` + `transform`); class-validator DTOs | DTO specs; `forbidNonWhitelisted` returns 400 on unknown fields | done (uploads: HYP-38) |
| `.env` excluded from git, no secret committed | HYP-9 | `.gitignore`; `.env.example` with placeholders; `JWT_SECRET` placeholder rejected at boot | gitleaks in pre-commit + CI | done |
| No console error/warning (browser or server) during the defense | HYP-45 | clean-browser check on the auth flow; the only console line is the browser's own network log of a deliberate 401 | headless-Chromium walk in the HYP-45 PR; `docs/defense/known-limitations.md` | partial - re-check per feature |
| Torrent downloaded "by hand" (no streaming-from-torrent library) | HYP-12 | — | — | todo |
| Legal, rights-free sources only; >= 2 external search sources | HYP-13 | — | — | todo |

## Auth

| Requirement | Issue | Where handled | Proof | State |
|---|---|---|---|---|
| Email + password, password hashed | HYP-10 | `POST /users` (register), `POST /auth/login` | `auth.service.spec.ts`, `users.service.spec.ts` | done |
| OAuth "42 strategy" + >= 1 other provider | HYP-11 | — | — | todo |
| Reset password by email | HYP-34 (needs HYP-32 mail infra) | — | — | todo |
| One-click logout | HYP-35 (backend) / HYP-45 (frontend) | frontend `logout()` clears token + query cache -> guard redirects | `auth-provider.test.tsx` logout case | partial - server-side token invalidation is HYP-35 |
| Language choice, default English | HYP-36 | `User.preferredLanguage` enum exists | — | partial - UI + i18n todo |
| `GET /users/me` current-user shortcut | HYP-44 | `UsersController.findMe` | unit + HTTP routing test | done |
| Frontend: router, API client, auth context, protected routes | HYP-45 | `src/features/auth/`, `src/lib/`, `RequireAuth` | 28 frontend tests; ADR-0006 | done |

## API (RESTful + OAuth2)

| Requirement | Issue | Where handled | Proof | State |
|---|---|---|---|---|
| `POST /oauth/token` (client + secret -> token) | HYP-15 | — | — | todo |
| Imposed endpoints (`/users`, `/users/:id`, `/movies`, `/movies/:id`, `/comments`, `/comments/:id`, `/movies/:movie_id/comments`) | HYP-15 | `/users`, `/users/:id` exist | — | partial |
| Correct HTTP codes (403 on editing another profile, etc.) | HYP-10 | `PATCH`/`DELETE /users/:id` -> 403 when `user.id !== :id` | HTTP-level guard tests | partial - full table in `rest-proof.md` (todo) |
| RESTful proof for the defense | HYP-40 | Swagger at `/api-docs` | — | partial - `rest-proof.md` todo |

## Video library and player

| Requirement | Issue | State |
|---|---|---|
| Search >= 2 legal sources, thumbnail grid, infinite scroll, sort/filter | HYP-13 | todo |
| Video page: player, summary, cast, comments, subtitles, transcoding | HYP-14 | todo |
| Background torrent download, keep file, delete if unwatched 1 month | HYP-12 / HYP-14 | todo |

## Notes

- The subject is dated (v7.1) - always reconfirm the exact wording on the
  intra before the final defense.
- Reconfirm the RNCP "Développement web et mobile" Web sub-category
  thresholds (min 15000 XP / min 2 projects) on meta.intra.42.fr before
  treating the certification as acquired.
