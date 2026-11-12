# Hypertube

Video streaming platform built for the 42 school curriculum
(post-common-core): search movies from legal sources and watch them in the
browser. The core of the project is a BitTorrent client written from
scratch (no BitTorrent or streaming library) that lets a video start
playing while it is still downloading.

## Where it stands

- **Done:** accounts (email + password, OAuth 42 and GitHub), sessions with
  rotating refresh tokens, profiles and pictures, API keys and
  `POST /oauth/token`, English and French, security headers, CI.
- **Next:** the core. The BitTorrent client, the movie library
  (archive.org + PeerTube, TMDb + OMDb), streaming with ffmpeg, the video
  page and comments. The decisions are taken (ADR-0018 to 0021), the code is
  not written yet.
- **Also open:** password reset and email change by mail (HYP-34, HYP-39).

Status of every subject requirement:
[`docs/defense/traceability.md`](docs/defense/traceability.md).

New on the project: read this page, then
[`docs/onboarding.md`](docs/onboarding.md). Every other document is listed
in [`docs/README.md`](docs/README.md).

## Stack

- **Backend**: [NestJS](https://nestjs.com) + [TypeORM](https://typeorm.io) (PostgreSQL)
- **Frontend**: [React](https://react.dev) + [Vite](https://vite.dev)

## Tooling

- **Language**: TypeScript everywhere (backend and frontend)
- **Testing**: [Jest](https://jestjs.io) (backend unit), [Vitest](https://vitest.dev) (frontend unit), [Playwright](https://playwright.dev) (real-browser e2e in Chromium and Firefox, through the edge proxy: sign-up and login, OAuth, session, profile and API keys, the layout on a phone, `frontend/e2e/`)
- **API docs**: [Swagger](https://github.com/nestjs/swagger) at `/api-docs` once the backend is running - also serves as evidence the API is RESTful
- **Code docs**: [Compodoc](https://compodoc.app) - `make doc` generates browsable module/controller/service docs into `docs/backend/` (gitignored, regenerate on demand) from the `/** */` comment every class carries (`docs/code-conventions.md` > Doc comments)
- **API testing**: [Bruno](https://www.usebruno.com) collection in `api/bruno/` - plain-text `.bru` files tracked in git (diffs in PRs, no account), with status/body assertions on every request. Open the folder in the Bruno app, or run it headless with `make test-api` (needs the stack up and `make install`); CI runs it on every PR
- **Lint/format**: [ESLint](https://eslint.org) + [Prettier](https://prettier.io), shared config across packages
- **Task runner**: [GNU Make](https://www.gnu.org/software/make/) wrapping the npm scripts
- **Git hooks**: a versioned pre-commit hook (`.githooks/`, see `CONTRIBUTING.md`) blocks commits that aren't formatted/linted
- **CI**: [GitHub Actions](https://github.com/features/actions) - lint/format/type-check/test/build on every push and PR, plus [Gitleaks](https://github.com/gitleaks/gitleaks) secret scanning and [Dependabot](https://docs.github.com/en/code-security/dependabot) for dependency updates
- **Containers**: [Docker](https://www.docker.com) / [Podman](https://podman.io)-compatible compose files (Postgres, backend, frontend, edge proxy): a shared `docker-compose.yml`, the dev stack in `docker-compose.dev.yml` (`make up`), the prod build in `docker-compose.prod.yml` (`make up-prod`), see ADR-0013.

## Prerequisites

- [Node.js](https://nodejs.org) 24, the version the images run - for the host-side gates (`make verify`, `make test-e2e`, `make test-api`) and non-Docker runs
- [Docker](https://www.docker.com) or [Podman](https://podman.io) (with `podman-compose`)
- [GNU Make](https://www.gnu.org/software/make/)

## Repo structure

```
Hypertube/
├── backend/            # NestJS API (Dockerfile: dev + prod stages)
├── frontend/           # React SPA + Playwright specs in e2e/ (Dockerfile: dev + prod stages, nginx.conf for prod)
├── proxy/              # nginx edge proxy: TLS on :8443, / to the SPA, /api/* to the backend (ADR-0009)
├── api/bruno/          # Bruno request collection (assertion-checked API calls, run in CI)
├── db/init/            # optional Postgres init scripts (empty today)
├── docs/               # ADRs, defense packet, diagrams, design mockup, dependency-upgrade log
├── scripts/            # check-docs.mjs, the doc drift check (make check-docs)
├── .github/            # CI workflows, Dependabot config, PR template
├── .githooks/          # pre-commit and commit-msg hooks (enabled by make install)
├── docker-compose.yml       # what dev and prod share (db, backend, frontend, proxy)
├── docker-compose.dev.yml   # dev: dev targets, mounted source (make up)
├── docker-compose.prod.yml  # prod: built backend, static SPA (make up-prod)
├── AUTHORS             # required by the marking sheet
└── .env.example        # required environment variables, copy to .env
```

Two independent packages (`backend/`, `frontend/`), each with its own
`package.json` and lockfile; no npm workspace.

## Running the project

**With Docker/Podman (recommended - matches the actual dev environment):**

```sh
cp .env.example .env   # first time only, fill in real values
make up                 # db, backend and frontend on the internal network, the edge proxy in front
```

The app is served only through the edge proxy at **https://localhost:8443** (self-signed certificate: accept the browser warning once; `http://localhost:8080` redirects there). The backend and the frontend publish no host port (`docs/adr/0009-nginx-edge-proxy-with-tls.md`). Sign-in with 42 and GitHub needs your own OAuth apps: [`docs/onboarding.md`](docs/onboarding.md) > Getting it running.

`make up` auto-detects `docker compose` vs `podman-compose` (see the Makefile) - same command works on Docker or Podman.

**Without containers (backend/frontend only, no Postgres, so anything that
touches the database fails; use `make up` for real work):**

```sh
make install         # install root tooling (TypeScript LSP, Bruno CLI) + backend + frontend dependencies, set up git hooks
make dev-backend      # run the NestJS API in watch mode (http://localhost:3000)
make dev-frontend     # run the Vite dev server (http://localhost:5173)
```

## Available commands

| Command | Description |
|---|---|
| `make install` | Install root tooling (TypeScript LSP, Bruno CLI), backend + frontend dependencies, set up git hooks |
| `make dev-backend` | Run the NestJS API in watch mode (no containers) |
| `make dev-frontend` | Run the Vite dev server (no containers) |
| `make up` | Compose up (db + backend + frontend), dev stack, Docker or Podman |
| `make up-prod` | The prod stack: built backend, SPA as static files, no mounted source (ADR-0013) |
| `make down` | Compose down |
| `make ps` | Compose ps |
| `make logs` | Compose logs -f (`logs-backend`, `logs-frontend`, `logs-db` for one service) |
| `make psql` | psql prompt on the dev database |
| `make be CMD="..."` / `make fe CMD="..."` | Run a command in the backend / frontend container (e.g. `npm install <pkg>`) |
| `make format` | Format code (Prettier, writes) on backend + frontend |
| `make format-check` | Check formatting without writing (used by the pre-commit hook and CI) |
| `make lint` | Lint (ESLint --fix) on backend + frontend |
| `make lint-check` | Lint without auto-fixing (used by the pre-commit hook and CI) |
| `make clean` | Stop and remove the containers (keeps volumes and images) |
| `make fclean` | `clean` + remove the volumes (database, `node_modules`) and the locally built images |
| `make re` | Full reset: `fclean` then `up` |
| `make wipe-db` | Drop only the database volume (fast schema reset) |
| `make typecheck` | `tsc --noEmit` on backend + frontend |
| `make test` | Run backend + frontend unit tests |
| `make test-e2e` | Run the Playwright e2e suite (needs the stack already up) |
| `make test-api` | Run the Bruno collection against the running backend |
| `make build` | Production build for backend + frontend |
| `make migration-generate NAME=...` | Write a TypeORM migration from the entity changes (`migration-run`, `-revert`, `-show`, `-check` too) |
| `make doc` | Generate the Compodoc backend docs into `docs/backend/` |
| `make check-docs` | Doc drift check: links, dashes, env variables, indexes, every page listed in `docs/README.md`, cited routes vs controllers and Bruno |
| `make verify` | Full local gate: format-check, lint-check, typecheck, test, build, check-docs |

See `make help` for the up-to-date list.

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the workflow (issues,
branches, commits, checks) and
[`docs/code-conventions.md`](./docs/code-conventions.md) for the coding rules.
