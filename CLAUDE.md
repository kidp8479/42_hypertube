# Hypertube - 42 post-tronc-commun

## Context

- 42 slug `42cursus-hypertube`, 15750 XP, category "Web".
- RNCP contribution: Titre 6, Option 1 "Développement web et mobile",
  sub-category Web (threshold: min 15,000 XP / min 2 projects - Hypertube
  alone already exceeds the XP threshold, a 2nd web project will follow,
  probably Red-tetris, to reach the project count).
- Subject PDF: `pdf/en.subject_hypertube.pdf` in
  `/home/kidp/42/veille-42-projets/` (version 7.1, dated - reconfirm the
  exact rules on the intra before the final defense; that file is a
  working summary, not exhaustive).
- Post-tronc-commun student, Paris campus, targeting an internship on
  React/NestJS/TypeORM. Project chosen because its subject imposes no
  framework constraint (unlike Matcha/Camagru, which impose a
  micro-framework with no ORM) - a chance to practise the internship stack
  in real conditions on a project with strong portfolio value.

## Stack

- Decided: backend **NestJS** + **TypeORM** (PostgreSQL); frontend
  **React**.
- Not settled: torrent handling, transcoding. Auth: JWT bearer (ADR-0002),
  argon2id (ADR-0001), OAuth 42 + GitHub (ADR-0007).

## Eliminatory constraints (0 if violated)

- **Torrent**: any turnkey lib that creates a stream from a torrent is
  forbidden (webtorrent, pulsar, peerflix explicitly named). Download "by
  hand" (BitTorrent protocol, or low-level libs for parsing/tracker only,
  no ready-made streaming lib). The stream to the browser must start
  before the full download completes.
- **Legal sources only** (e.g. legittorrents.info, archive.org), at least
  2 external sources for search.
- **Security**: no plaintext password in the DB, no SQL injection, no
  HTML/JS injection, validation of all forms and uploads, `.env` excluded
  from git.
- **No console error/warning** in the browser or on the server during the
  defense.
- **Auth**: email+password (hashed) + OAuth "42 strategy" + at least 1
  other provider + password reset by email + 1-click logout + language
  choice (default English).
- **RESTful API with OAuth2** (`POST /oauth/token` with client+secret ->
  token), imposed endpoints (`/users`, `/users/:id`, `/movies`,
  `/movies/:id`, `/comments`, `/comments/:id`,
  `/movies/:movie_id/comments`), correct HTTP codes (403 when trying to
  edit another user's profile). Proof of RESTfulness is asked for at the
  defense.

## Functional spec (summary - reread the PDF when in doubt)

- Video library (logged-in users only): search across >=2 legal sources,
  results as thumbnails sorted by name when searching, otherwise the most
  popular. Thumbnail = name, year, IMDb/OMDb/TMDb rating, cover, watched /
  not watched status. Infinite scroll pagination. Sort/filter by name,
  genre, rating, year.
- Video page: embedded player, summary, cast, duration, rating, cover,
  comments (read + write). Torrent download as a non-blocking background
  task if not already downloaded; file kept server-side after the full
  download, **deleted if not watched for 1 month**. English subtitles if
  available + the user's preferred language if the movie is not already in
  that language. On-the-fly transcoding if the format is not natively
  playable by the browser (mkv at minimum).

## 42 process checklist

<!-- instantiated from .claude/standards/school-42.md -->

- Repo visibility: public, deliberate choice (portfolio) - no secret may
  ever land in the git history
- Login in repo name: n/a
- Imposed directory structure: n/a (monorepo backend/frontend, free
  structure)
- Evaluation runs on: the evaluated group's machine
- Solo or team: solo
- Seeded test accounts: <to define before the first `browser-e2e` session>

## Engineering standards

Project-agnostic standards: `.claude/standards/engineering.md`. Deviations
and additions specific to this project:

- `synchronize: true` (TypeORM) stays acceptable in dev while the `User`
  schema is still moving (hashing/reset in progress, then `movies`/
  `comments` to come) - real migrations before the defense or before there
  is real data to preserve, not before.
- File naming: backend files are `<kebab-name>.<role>.ts`
  (`cookie-state.store.ts`, `fortytwo.strategy.ts`), frontend files are
  kebab-case `<feature>-<descriptor>`. Reuse an existing role suffix
  before inventing one. Full rule in `CONTRIBUTING.md` > File naming.
- Compodoc docs (JSDoc `/** */`) on any method/class whose WHY is not
  obvious from reading it - public or private (e.g. `AuthService.
  dummyHash`, `UsersService.findAvailableUsername`). No comment when the
  name + signature already make the WHY clear.
- Commits: `type(HYP-N): summary`, with the Linear issue key, one logical
  change per commit.
- Branches: rebase onto `main`, never merge `main` into a feature branch.
  Merge commits exist only for the PR merge itself; branch protection
  (`required_status_checks.strict`) blocks a stale PR.
- Lint: `lint:check` runs with `--max-warnings 0` and the complexity budget
  of ADR-0005. Over budget = split the function or file, never disable the
  rule inline. The pre-commit hook runs `make format-check` and
  `make lint-check`.
- A new env variable touches four places: the Joi schema
  (`backend/src/config/env.validation.ts`, ADR-0003), `.env.example`,
  `docker-compose.yml` (pass-through to the container) and the `e2e` job
  in `.github/workflows/ci.yml` (placeholder value). Missing any one of
  them breaks boot in that environment.
- Auth is default-deny: `JwtAuthGuard` is global (`APP_GUARD`), so every
  route is protected unless it carries `@Public()` explicitly (e.g. the
  OAuth login/callback routes).
- Diagrams: on top of the standard's PR mermaid diagram, the same
  diagram is committed to its domain page `docs/diagrams/<domain>.md`
  (Mermaid overview of the domain first, then one section per flow), in
  the same PR. Mandatory - `docs/diagrams/README.md`.
- DTO rules, HTTP status codes and spec layout are in `CONTRIBUTING.md`
  (API conventions, Testing). Read them before adding an endpoint or a
  spec.

## Not yet decided / to settle at the start of the work session

- Detail of the BitTorrent client implementation (from scratch vs allowed
  low-level libs such as `bittorrent-protocol` / `bencode` /
  `parse-torrent` - to check case by case)
- Legal video search sources to use (2 minimum)
- OMDb vs TMDb as the metadata provider
- Transcoding strategy (on-the-fly ffmpeg, format cache)

## Don't forget

- The subject is dated (version 7.1) - always confirm the exact rules on
  the intra before the final defense; this file is only a working summary.
- Check meta.intra.42.fr for the RNCP certification before considering
  this project "acquired" for the Web sub-category.
