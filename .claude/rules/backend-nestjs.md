---
paths:
  - "backend/src/**/*.ts"
---

# NestJS conventions (backend)

Additions to `CONTRIBUTING.md` (API conventions, File naming, Testing) and
the ADRs. Where those cover a topic, they win: this file does not restate
them.

## Layers

- **Controllers are thin**: validate (DTO), delegate to one service call,
  return. No query, no business conditional, no repository injection.
- **Services own the logic** and the "not found" / ownership checks
  (single source of truth, see CONTRIBUTING > HTTP status codes).
- Injected dependencies are `private readonly`, always.
- A service never injects another module's repository. It goes through
  that module's exported service (add the method there if missing).
- No `index.ts` barrel files: import from the source file. Barrels hide
  circular imports between modules.
- A circular module dependency is restructured, not patched with
  `forwardRef`.

## Errors

- Request-path code (controllers, services, guards, strategies) throws
  Nest's `HttpException` subclasses (`NotFoundException`,
  `ForbiddenException`, `ConflictException`...), never a bare `Error`,
  which surfaces as an opaque 500.
- A bare `Error` is right where no HTTP request exists (boot-time config
  parsing, migrations) and in a low-level helper whose caller maps the
  error to an HTTP exception.
- Never an empty `catch`, never a `catch` that only logs and continues as
  if nothing happened. Catch to map to a specific exception, or let it
  propagate.
- Error responses never carry internals: no SQL, no stack, no clashing
  value. A unique violation is already mapped to 409 globally
  (CONTRIBUTING > HTTP status codes): do not catch it per handler.
- Logging goes through Nest's `Logger` (`new Logger(Foo.name)`), never
  `console.*`. Never log a password, hash, token or cookie.

## Configuration

- New values are read through `ConfigService` and validated by the Joi
  schema (ADR-0003), and an env variable touches the four places listed
  in `CLAUDE.md`.
- Reading `process.env` directly is the exception, only where
  `ConfigService` cannot exist: code that runs outside Nest (the TypeORM
  CLI data source) or is evaluated at import time (a decorator argument).
  Such a read carries a comment saying why, and one with that comment is
  deliberate, not something to "fix". Plain `NODE_ENV` checks are fine.
- No default value for a secret (`JWT_SECRET ?? 'dev'`): a missing secret
  fails the boot.

## Calling external APIs (movie sources, metadata providers)

- One module per provider, its service the only place that knows the
  provider's URL, auth and response shape. The rest of the app gets
  domain types, not the raw payload.
- Every outbound call has a timeout (`AbortSignal.timeout(ms)`) and an
  error path. A provider failure becomes a `BadGatewayException` / `ServiceUnavailableException` (or a
  degraded result when another source can answer), never an unhandled
  rejection or a raw 500.
- API keys come from config (above), never from code or logs.

## Lists and pagination

- No unbounded list endpoint unless the subject imposes it: a list takes
  `page` + `limit` (or a cursor), with `limit` capped in the DTO (`@Type(() => Number) @IsInt() @Min(1)
  @Max(n)`) and a default in the service.
- Sort and filter fields are an allowlist (`@IsIn([...])`), never a
  string interpolated into `orderBy`.
- The response shape is the same for every paginated endpoint; reuse the
  first one's DTO instead of inventing a second.
