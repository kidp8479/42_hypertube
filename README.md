# Hypertube

Video streaming platform built for the 42 school curriculum
(post-common-core). The core of the project is a BitTorrent client
implemented from scratch (low-level protocol, no ready-made streaming
library) that lets a video start playing while it's still downloading.

## Stack

- **Backend**: [NestJS](https://nestjs.com) + [TypeORM](https://typeorm.io) (PostgreSQL)
- **Frontend**: [React](https://react.dev) + [Vite](https://vite.dev)

## Tooling

- **Language**: TypeScript everywhere (backend and frontend)
- **Testing**: [Jest](https://jestjs.io) (backend unit + e2e), [Vitest](https://vitest.dev) (frontend unit), [Playwright](https://playwright.dev) (real-browser e2e in Chromium and Firefox: the auth flow, the OAuth handshake guards, the layout on a phone, `frontend/e2e/`)
- **API docs**: [Swagger](https://github.com/nestjs/swagger) at `/api-docs` once the backend is running - also serves as evidence the API is RESTful
- **Code docs**: [Compodoc](https://compodoc.app) - `make doc` generates browsable module/controller/service docs into `docs/backend/` (gitignored, regenerate on demand) from the `/** */` comment every class carries (`CONTRIBUTING.md` > Doc comments)
- **API testing**: [Bruno](https://www.usebruno.com) collection in `api/bruno/` - plain-text `.bru` files tracked in git (diffs in PRs, no account), with status/body assertions on every request. Open the folder in the Bruno app, or run it headless with `make test-api` (needs the stack up); CI runs it on every PR
- **Lint/format**: [ESLint](https://eslint.org) + [Prettier](https://prettier.io), shared config across packages
- **Task runner**: [GNU Make](https://www.gnu.org/software/make/) wrapping the npm scripts
- **Git hooks**: a versioned pre-commit hook (`.githooks/`, see `CONTRIBUTING.md`) blocks commits that aren't formatted/linted
- **CI**: [GitHub Actions](https://github.com/features/actions) - lint/format/type-check/test/build on every push and PR, plus [Gitleaks](https://github.com/gitleaks/gitleaks) secret scanning and [Dependabot](https://docs.github.com/en/code-security/dependabot) for dependency updates
- **Containers**: [Docker](https://www.docker.com) / [Podman](https://podman.io)-compatible `docker-compose.yml` (Postgres, backend, frontend). Currently `dev`-targeted only - a production target is tracked in `HYP-17`.
- **Project management**: [Linear](https://linear.app) (issues), [Slack](https://slack.com) (communication), GitHub (code/PRs) - see `CONTRIBUTING.md`

## Prerequisites

- [Node.js](https://nodejs.org) (check the active version with `node --version`; kept on latest LTS/current) - only needed for local (non-Docker) development
- [Docker](https://www.docker.com) or [Podman](https://podman.io) (with `podman-compose`)
- [GNU Make](https://www.gnu.org/software/make/)

## Repo structure

```
Hypertube/
├── backend/            # NestJS API (Dockerfile: dev + prod stages)
├── frontend/           # React SPA (Dockerfile: dev + prod stages, nginx.conf for prod)
├── api/bruno/          # Bruno request collection (assertion-checked API calls, run in CI)
├── db/init/            # optional Postgres init scripts
├── docs/               # ADRs, defense packet, diagrams, design mockup, dependency-upgrade log
├── docker-compose.yml  # db + backend + frontend (dev target)
└── .env.example        # required environment variables, copy to .env
```

Two independent packages (`backend/`, `frontend/`) - no shared npm/pnpm
workspace for now (see `CONTRIBUTING.md` for the reasoning).

## Running the project

**With Docker/Podman (recommended - matches the actual dev environment):**

```sh
cp .env.example .env   # first time only, fill in real values
make up                 # db, backend and frontend on the internal network, the edge proxy in front
```

The app is served only through the edge proxy at **https://localhost:8443** (self-signed certificate: accept the browser warning once; `http://localhost:8080` redirects there). The backend and the frontend publish no host port (`docs/adr/0009-nginx-edge-proxy-with-tls.md`). After pulling this change, update your `.env` (see `.env.example`): `FRONTEND_ORIGIN`, the two `*_CALLBACK_URL`, and the redirect URIs registered at 42 and GitHub.

`make up` auto-detects `docker compose` vs `podman-compose` (see the Makefile) - same command works on Docker or Podman.

**Without containers (backend/frontend only, no Postgres):**

```sh
make install         # install root tooling (TypeScript LSP only) + backend + frontend dependencies, set up git hooks
make dev-backend      # run the NestJS API in watch mode (http://localhost:3000)
make dev-frontend     # run the Vite dev server (http://localhost:5173)
```

## Available commands

| Command | Description |
|---|---|
| `make install` | Install root tooling (TypeScript LSP only), backend + frontend dependencies, set up git hooks |
| `make dev-backend` | Run the NestJS API in watch mode (no containers) |
| `make dev-frontend` | Run the Vite dev server (no containers) |
| `make up` | Compose up (db + backend + frontend), Docker or Podman |
| `make down` | Compose down |
| `make ps` | Compose ps |
| `make logs` | Compose logs -f |
| `make format` | Format code (Prettier, writes) on backend + frontend |
| `make format-check` | Check formatting without writing (used by the pre-commit hook and CI) |
| `make lint` | Lint (ESLint --fix) on backend + frontend |
| `make lint-check` | Lint without auto-fixing (used by the pre-commit hook and CI) |
| `make re` | Full reset: `fclean` then `up` |
| `make wipe-db` | Drop only the database volume (fast schema reset) |
| `make typecheck` | `tsc --noEmit` on backend + frontend |
| `make test` | Run backend + frontend unit tests |
| `make test-e2e` | Run the Playwright e2e suite (needs the stack already up) |
| `make test-api` | Run the Bruno collection against the running backend |
| `make build` | Production build for backend + frontend |
| `make migration-generate NAME=...` | Write a TypeORM migration from the entity changes (`migration-run`, `-revert`, `-show`, `-check` too) |
| `make doc` | Generate the Compodoc backend docs into `docs/backend/` |
| `make check-docs` | Doc drift check: links, dashes, env variables, indexes, cited routes vs controllers and Bruno |
| `make verify` | Full local gate: format-check, lint-check, typecheck, test, build, check-docs |

See `make help` for the up-to-date list.

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the dev workflow (commits,
branches, tooling used).
