# Onboarding

The path for a developer who joins or takes over Hypertube: read the
[README](../README.md), then this page, and you can run the app, pass the
gates and open a first PR. Details are one link away; this page does not
repeat them.

## 1. What this is and what is graded

Hypertube is the 42 school's video-streaming project: search movies from
legal sources, and watch them in the browser while a BitTorrent client
written for the project downloads them. Graded on the subject (v7.1) and a
marking sheet. Breaking an **eliminatory** rule scores 0:

| Rule | Where it is handled |
|---|---|
| No library that streams from a torrent (webtorrent, peerflix...): the client is hand-written, and the stream starts before the download ends | the core, not built yet (HYP-12) |
| Legal sources only, at least two for the search | the core (HYP-13) |
| No plaintext password, no SQL or HTML/JS injection, every form and upload validated, `.env` out of git | [`defense/security-checklist.md`](defense/security-checklist.md) |
| No error or warning in the browser or server console | [`defense/known-limitations.md`](defense/known-limitations.md) for the lines the browser prints itself |
| Email + password, OAuth 42 + one more provider (GitHub), reset by email, one-click logout, language choice | [`diagrams/auth.md`](diagrams/auth.md), [`diagrams/i18n.md`](diagrams/i18n.md); the reset is HYP-34 |
| RESTful API with OAuth2 (`POST /oauth/token`) and the imposed routes | Swagger at `/api-docs`; `/movies` and `/comments` are HYP-15 |

Every requirement, with its status, code and test:
[`defense/traceability.md`](defense/traceability.md).

**State today:** accounts, sessions, OAuth, profiles, pictures, API keys,
two languages and the security headers are done. The core (library,
torrent, streaming, video page, comments) is next.

## 2. Architecture tour

- **Containers:** an nginx edge proxy terminates TLS on `:8443` and routes
  `/` to the SPA and `/api/*` to the backend; Postgres sits behind the
  backend. Nothing else publishes a port.
  [`diagrams/network.md`](diagrams/network.md).
- **Backend** (`backend/src/`, NestJS + TypeORM): one folder per module,
  depending one way: `auth` -> `users` / `api-clients` -> `sessions` ->
  `common` / `config`. Layout in [`backend/README.md`](../backend/README.md).
- **Frontend** (`frontend/src/`, React + Vite): `features/<domain>/`,
  shared UI in `ui/`, infrastructure in `lib/`. Layout in
  [`frontend/README.md`](../frontend/README.md), choices in
  [ADR-0006](adr/0006-frontend-architecture.md).
- **Auth:** a 15 minute JWT in memory plus a rotating refresh token in an
  `HttpOnly` cookie; every route is protected unless marked `@Public()`.
  [`diagrams/auth.md`](diagrams/auth.md).
- **Schema:** built by TypeORM migrations at boot, never `synchronize`.
  [`diagrams/database.md`](diagrams/database.md).

## 3. Getting it running

Needs Docker (or rootless Podman with `podman-compose`), GNU Make and
Node.js (latest LTS, for the host-side gates).

```sh
git clone git@github.com:kidp8479/42_hypertube.git && cd 42_hypertube
cp .env.example .env    # then fill it, below
make install            # host tooling, both packages, git hooks
make up                 # dev stack; Docker or Podman, auto-detected
```

Open **https://localhost:8443** and accept the self-signed certificate once
(`http://localhost:8080` redirects there). Swagger is at `/api-docs`.

### The `.env`

The comments in `.env.example` say what each variable expects; the app
refuses to boot on a missing value or a left-over placeholder (ADR-0003).
Set `THROTTLE_LIMIT_MULTIPLIER` (e.g. 100) for dev: a Bruno run alone
registers 8 accounts, and `POST /users` allows 10 per hour.

### Your own OAuth apps

A `client_secret` is personal, and each provider locks its callback to one
exact URL, so every developer registers their own two apps:

- **42** at https://profile.intra.42.fr/oauth/applications/new. Redirect
  URI: `https://localhost:8443/api/auth/42/callback` (your
  `HYPERTUBE_HTTPS_PORT` if you changed it). It must equal
  `FORTYTWO_CALLBACK_URL` exactly, or 42 answers "The redirect uri included
  is not valid". UID and secret go to `FORTYTWO_CLIENT_ID` /
  `FORTYTWO_CLIENT_SECRET`.
- **GitHub** at https://github.com/settings/developers ("New OAuth App").
  Homepage `https://localhost:8443`, callback
  `https://localhost:8443/api/auth/github/callback` (one URI per app: edit
  it when the port changes). Leave wildcard matching, Device Flow and
  expiring user tokens off (the token is used once, never stored). ID and
  secret go to `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`, the URI to
  `GITHUB_CALLBACK_URL`.

### A first account

The database starts empty: register on `/register`, or `POST /users`
through Swagger. The `E2E_USER_*` variables name the dev account the
browser checks log in with; create it the same way on a fresh database.

### Traps on day one

- **Dependencies live in a volume.** Each container's `node_modules` is a
  named volume, not the bind-mounted source: a package installed on the host
  is invisible to the container. Install inside it: `make be CMD="npm
  install <pkg>"` (`make fe` for the frontend). After a pull that changes a
  lockfile, the container runs `npm ci` itself on start
  (`docker compose restart backend` if it was running). After a pull that
  changes a Dockerfile or adds a volume, rebuild once:
  `docker compose ... up -d --build` (`make up` does not rebuild).
- **`backend_dist` can come up root-owned** on a fresh `up`, and
  `tsc --watch` fails with `EACCES`: `docker compose exec -u root backend
  chown -R node:node /app/dist`, then restart `backend`.
- **VS Code ignores the workspace TypeScript** until you accept it: Command
  Palette -> "TypeScript: Select TypeScript Version..." -> "Use Workspace
  Version". Before that, the Problems panel shows false "Cannot find name
  'describe'" errors while `make typecheck` is green. The key is
  `typescript.tsdk`, never `js/ts.tsdk.path`.
- **Run the gates on the host** (`make test`, `make lint`...), not in a
  container: Jest's workers get killed by the container's memory cap.
- **Playwright** needs its browsers once per machine: `cd frontend && npx
  playwright install chromium firefox`.

## 4. How work flows

Linear holds the issues (project "Hypertube"); GitHub holds the code. One
issue, one branch (Linear's suggested name), one PR; rebase on `main`, never
merge it in; commits are `type(HYP-N): summary`. Opening a branch moves the
issue to In Progress and merging moves it to Done, **even when the PR only
does part of it**: put the rest in a child issue, or move the issue back.
The PR template's checklist is filled honestly. `main` merges only when the
required checks (`backend`, `frontend`, `e2e`, `scan`, `docs`) are green on
top of the current `main`. Full rules: [`CONTRIBUTING.md`](../CONTRIBUTING.md).

## 5. Quality gates

- `make verify` runs format, lint, typecheck, tests, build and the doc
  check: what CI runs, minus the browser and API suites (`make test-e2e`,
  `make test-api`, with the stack up).
- **Lint budget** (ADR-0005): function size, nesting and complexity are
  capped with zero warnings allowed. Over budget means split the code, never
  disable the rule.
- **`make check-docs`** fails on a broken link, a dash, a route cited in the
  docs that no controller or Bruno request has, or an env variable missing
  from compose, `.env.example` or CI. A new env variable touches the Joi
  schema, `.env.example`, `docker-compose.yml` and the `e2e` job.
- Tests: co-located specs, one layout ([CONTRIBUTING > Spec file
  layout](../CONTRIBUTING.md#spec-file-layout)); a Bruno request with
  assertions per route (`api/bruno/`); Playwright specs in
  `frontend/e2e/` run through the proxy.

## 6. Docs map

[`docs/README.md`](README.md) lists every document with who it is for.
The rule that keeps them true: a PR that changes behaviour updates the page
that describes it, its diagram included, in the same PR.

## 7. Security stance

Default-deny auth (`@Public()` opens a route), ownership checked from the
token's user id (403 on someone else's row), validation on every input,
secrets only in `.env`. What is deliberately not done is in
[`known-limitations.md`](defense/known-limitations.md); the controls and
their proofs in [`security-checklist.md`](defense/security-checklist.md).
A security review runs over each auth or user-data change before merge.

## 8. Where the state lives

- **Linear**, project "Hypertube": the backlog by theme (core, security,
  polish) and the "Session Handoff" document, which says what is in flight
  and what to pick up next.
- **Slack** `#hypertube-daily-log`: one recap per work session.
- **Open decisions** (each becomes an ADR when taken): the two legal
  sources, OMDb or TMDb, which low-level BitTorrent libraries are allowed,
  the transcoding strategy. Listed in [`adr/README.md`](adr/README.md),
  "Planned".

## 9. Operations

A dev VPS runs one stack at a time, next to another project's: ask the
owner for access, and do not touch what is not Hypertube's. The defense
runs on the evaluated group's machine, from a clean clone.

## 10. Glossary

| Term | Meaning |
|---|---|
| edge proxy | the nginx container in front of everything (`proxy/`, ADR-0009) |
| access token | the 15 minute JWT sent as `Authorization: Bearer` |
| refresh token, family | the `HttpOnly` cookie that renews the access token; the tokens of one login form a family, revoked together (ADR-0011) |
| exchange code | the single-use code an OAuth callback hands the SPA, traded for a token (ADR-0007) |
| claim | taking over an unverified account when its email's provider owner signs in (ADR-0007) |
| API key, `cid` | a user's client id + secret for `POST /oauth/token`; `cid` marks a token bought with one (ADR-0015) |
| `@Public()` | the decorator that opens a route; everything else needs a token |
| Bruno | the API request collection in `api/bruno/`, run by `make test-api` |
| marking sheet | the evaluator's grid, stricter than the subject in places |
