---
paths:
  - "backend/src/**/*.entity.ts"
  - "backend/src/**/*.service.ts"
  - "backend/src/migrations/**/*.ts"
  - "backend/src/database/**/*.ts"
---

# TypeORM conventions (backend)

Additions to `CONTRIBUTING.md` > Database schema and ADR-0010 (migrations
build the schema, `synchronize` off). Keep the existing entity style
(integer primary keys, camelCase columns): changing it means a migration
for no gain.

## Entities

- Data only: no business logic in an entity class.
- One entity per file. An enum shared by an entity and DTOs sits in its
  own file once a second file needs it.
- Relations are explicit (`@ManyToOne` + `@JoinColumn`), never
  `eager: true`: load a relation where the query needs it.
- Index the real foreign-key column (class-level `@Index` or the
  migration). An expression index (on `LOWER(column)`, for instance) lives in its
  migration only and is documented on the entity field.
- A sensitive column (a hash, a secret) is `select: false` plus
  `@Exclude()`: left out of normal reads, dropped from responses even when
  loaded on purpose.

## Queries

- `find*` options for simple reads; `createQueryBuilder` when the query
  needs a join condition, a subquery or an aggregate. Both are fine in a
  service; move them to a dedicated query method once a service grows past
  the complexity budget.
- Parameters always bound (`:name` + params object), never interpolated
  into the SQL string. A dynamic column name (sort) comes from an
  allowlist.
- Load only what the caller uses (`select`, `relations`).
- **`select` must include every `order` column.** A `findOne` whose
  `where` crosses a relation is wrapped in a `DISTINCT` subquery; ordering
  by a column left out of `select` makes Postgres reject the query
  (`42703`) at runtime. Mocked-repository unit tests cannot catch this:
  check such a query against the real database (e2e, or `make test-api`).
- A "find or 404" is one helper per entity in its service, not repeated
  per handler.

## Transactions

- Several writes that must succeed or fail together run in
  `dataSource.transaction(async (manager) => { ... })`.
- Inside it, every read and write goes through `manager`. A call on an
  injected repository inside the callback runs *outside* the transaction.
- A helper called from the transaction takes the `EntityManager` as a
  parameter.
- `createQueryRunner()` only when the callback form cannot express the
  flow (savepoints); then `release()` in a `finally`, always.

## Migrations

- Generated (`make migration-generate NAME=...`), then read: see
  CONTRIBUTING for the rename-as-drop trap.
- Every `up()` has a `down()` that undoes it.
- One migration per logical schema change; data backfills
  (`INSERT`/`UPDATE`) in their own migration, not mixed into an `ALTER`.
- Extra care, and say so in the PR (one-way door):

  | Operation | Risk | Do instead |
  |---|---|---|
  | `DROP COLUMN` / `DROP TABLE` | data loss | stop using it in code first, drop in a later PR |
  | `ALTER COLUMN ... TYPE` | data corruption | test on a copy of real data |
  | `NOT NULL` on an existing column | fails on existing nulls | backfill first, or add a `DEFAULT` |
  | rename | generated as drop + add | rewrite as `RENAME` by hand |
