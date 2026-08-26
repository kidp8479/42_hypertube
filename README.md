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
- **Testing**: [Jest](https://jestjs.io) (backend unit + e2e)
- **Lint/format**: [ESLint](https://eslint.org) + [Prettier](https://prettier.io), shared config across packages
- **Task runner**: [GNU Make](https://www.gnu.org/software/make/) wrapping the npm scripts
- **Git hooks**: a versioned pre-commit hook (`.githooks/`, see `CONTRIBUTING.md`) blocks commits that aren't formatted/linted
- **CI**: [GitHub Actions](https://github.com/features/actions) - lint/format/type-check/test/build on every push and PR, plus [Gitleaks](https://github.com/gitleaks/gitleaks) secret scanning and [Dependabot](https://docs.github.com/en/code-security/dependabot) for dependency updates
- **Containers**: [Docker](https://www.docker.com) / [Podman](https://podman.io)-compatible setup (in progress)
- **Project management**: [Linear](https://linear.app) (issues), [Slack](https://slack.com) (communication), GitHub (code/PRs) - see `CONTRIBUTING.md`

## Prerequisites

- [Node.js](https://nodejs.org) (check the active version with `node --version`; kept on latest LTS/current)
- [Docker](https://www.docker.com) or [Podman](https://podman.io) - needed once `docker-compose.yml` is in place (not yet)
- [GNU Make](https://www.gnu.org/software/make/)

## Repo structure

```
Hypertube/
├── backend/    # NestJS API
├── frontend/   # React SPA
└── db/         # database-related scripts (TBD)
```

Two independent packages (`backend/`, `frontend/`) - no shared npm/pnpm
workspace for now (see `CONTRIBUTING.md` for the reasoning).

## Running the project

```sh
make install         # install backend + frontend dependencies
make dev-backend      # run the NestJS API in watch mode (http://localhost:3000)
make dev-frontend     # run the Vite dev server (http://localhost:5173)
```

## Available commands

| Command | Description |
|---|---|
| `make install` | Install backend + frontend dependencies |
| `make dev-backend` | Run the NestJS API in watch mode |
| `make dev-frontend` | Run the Vite dev server |
| `make format` | Format code (Prettier) on backend + frontend |
| `make lint` | Lint (ESLint --fix) on backend + frontend |
| `make test` | Run backend unit tests |
| `make build` | Production build for backend + frontend |

See `make help` for the up-to-date list.

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the dev workflow (commits,
branches, tooling used).
