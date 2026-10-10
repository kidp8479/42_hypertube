# Hypertube - backend

NestJS + TypeORM (PostgreSQL) API. Project overview, stack and setup are in
the [root README](../README.md); conventions in
[`CONTRIBUTING.md`](../CONTRIBUTING.md).

## Layout

```
src/
├── main.ts           # bootstrap: global ValidationPipe, serializer, CORS, Swagger
├── app.module.ts     # composition root: config, TypeORM, throttler, global guards
├── config/           # Joi env schema (ADR-0003), throttle scaling
├── common/           # cross-module decorators (@NormalizeEmail, @Trim), QueryFailedFilter, utils
├── auth/             # login, JWT, OAuth 42 + GitHub, exchange code, guards (ADR-0002, ADR-0007)
└── users/            # User entity, /users endpoints
```

Files are named `<kebab-name>.<role>.ts`, specs co-located as
`<kebab-name>.<role>.spec.ts` (`CONTRIBUTING.md` > File naming).

## Scripts

Run from the repo root through `make` (host-side, see `CONTRIBUTING.md` >
Testing for why not inside the container):

| Make target | npm script |
|---|---|
| `make dev-backend` | `start:dev` (no database - use `make up` for anything touching Postgres) |
| `make test-backend` | `test` (Jest unit specs) |
| `make lint-check-backend` | `lint:check` (`--max-warnings 0`, ADR-0005) |
| `make typecheck-backend` | `typecheck` |
| `make doc` | `doc` (Compodoc into `docs/backend/`, gitignored) |

`npm run test:e2e` (Jest + supertest) also exists in `package.json`; the
real-browser suite lives in `frontend/e2e/` (`make test-e2e`).

Once the stack is up, Swagger is served at `/api-docs` and the Bruno
collection in `api/bruno/` runs with `make test-api`.
