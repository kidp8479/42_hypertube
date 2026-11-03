# Hypertube - backend

NestJS + TypeORM (PostgreSQL) API. Project overview, stack and setup are in
the [root README](../README.md); conventions in
[`CONTRIBUTING.md`](../CONTRIBUTING.md).

## Layout

```
src/
├── main.ts           # bootstrap: global ValidationPipe, serializer, exception filter, CORS, Swagger
├── app.module.ts     # composition root: config, TypeORM, throttler, global guards
├── config/           # Joi env schema (ADR-0003), named rate-limit policies, security headers, Swagger
├── common/           # cross-module decorators (@Public, @CurrentUser, @NormalizeEmail, @Trim), filters, pipes, utils
├── database/         # TypeORM data source (app and CLI)
├── migrations/       # the schema, one migration per change (ADR-0010)
├── auth/             # login, JWT, OAuth 42 + GitHub, exchange code, POST /oauth/token (ADR-0002, ADR-0007, ADR-0015)
├── users/            # /users endpoints, profile pictures, password strength (ADR-0016, ADR-0017)
├── sessions/         # refresh tokens and their cookie (ADR-0011)
└── api-clients/      # API keys, /api-clients endpoints (ADR-0015)
```

Files are named `<kebab-name>.<role>.ts`, specs co-located as
`<kebab-name>.<role>.spec.ts` (`docs/code-conventions.md` > File naming).
Every class carries a `/** */` doc comment, which `make doc` renders
(`docs/code-conventions.md` > Doc comments).

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

The end-to-end suite runs in a real browser and lives in `frontend/e2e/`
(`make test-e2e`).

Once the stack is up, Swagger is served at `/api-docs` and the Bruno
collection in `api/bruno/` runs with `make test-api`.
