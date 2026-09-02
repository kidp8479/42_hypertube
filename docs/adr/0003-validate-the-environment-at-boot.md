# Validate the environment at boot

**Date:** 2026-08-30 · **Status:** accepted

The backend reads infrastructure config and secrets from the environment
(`DATABASE_*`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `NODE_ENV`, ...). We load it
through `@nestjs/config` and validate the whole set against a **Joi schema**
(`src/config/env.validation.ts`) at startup. If any variable is missing or
malformed, the process refuses to boot.

## Why

- **A missing secret must fail loudly, immediately.** Without validation, an
  absent `JWT_SECRET` in production lets the app start and sign tokens with
  `undefined` — anyone can then forge a valid token, and the problem only
  shows up once users are affected. A boot-time check turns that into a
  crash at deploy time with a named error.
- **`NODE_ENV` drives destructive behaviour.** `synchronize` and SQL
  logging are gated on `NODE_ENV !== 'production'`. A typo (`NODE_ENV=prod`)
  would leave `synchronize: true` live in production, where TypeORM can
  drop or alter columns to match the entities. The schema only accepts
  `development | production | test`.
- **Type coercion in one place.** `process.env` values are always strings;
  the schema coerces `PORT` / `DATABASE_PORT` to numbers, so the rest of
  the code stops sprinkling `Number(...)` and `?? default`.
- **The schema is the documentation** of every variable the app expects,
  next to `.env.example`.

## Considered options

- **Nothing (`process.env` directly)** — the status quo we are replacing.
  Zero validation, defaults duplicated across files.
- **`class-validator`** — already used for HTTP DTOs. For env validation it
  needs a config class with decorators plus a custom `validate` function:
  more ceremony for this one object. Kept for DTOs, not used here.
- **`zod`** — equally capable. But `ConfigModule` has first-class support
  for `validationSchema` (Joi); `zod` would need a custom `validate:`
  callback. Joi is the path the NestJS docs describe, so it is the least
  surprising for anyone who knows the framework.
- **Validate only `JWT_SECRET`** — the marginal cost of covering the rest
  is one line each, and the other variables share the same failure mode.

## Consequences

- One more dependency (`joi`) and a schema file to keep in sync: **adding a
  new env variable means adding it to the schema**, or `ConfigModule`
  rejects it as unknown / the app reads `undefined`.
- `ConfigModule.forRoot({ ignoreEnvFile: true })`: Compose (dev) and the
  deploy environment (prod) inject variables into the process directly;
  there is no `.env` file inside the container. Local host-side runs
  (tests) get their own strategy — see HYP-27.
- `TypeOrmModule` and `JwtModule` move to their `*Async` form so their
  factories can read the validated config via `ConfigService` instead of
  `process.env`.
- Startup is now order-sensitive: `ConfigModule` must initialise before the
  modules whose factories depend on it (it is listed first in
  `AppModule.imports` and marked `isGlobal`).
