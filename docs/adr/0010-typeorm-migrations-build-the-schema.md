# TypeORM migrations build the schema, `synchronize` is off

**Date:** 2026-10-23 · **Status:** accepted

The schema used to come from `synchronize: true` outside production: TypeORM
altered the database to match the entities at every boot. Now the schema is
built by migrations only (`backend/src/migrations/`), applied by the app at
boot in every environment, and `synchronize` is off everywhere. A baseline
migration captures the two existing tables (`user`, `oauth_account`).

## Why

- **`synchronize` can drop or alter a column, and its data, without asking.**
  Acceptable on a throwaway dev database, not on one that holds anything.
- **A database must be rebuildable.** A reviewer, a new contributor or a
  deployment needs the same schema from the repository alone, not from "run
  the entities once and hope". The security checklist already said this had to
  happen before the defense.
- **Cheaper now than later.** Today there are two tables and one dev account.
  After `movies`, `comments` and the torrent tables, the baseline would have
  to describe a moving target and real data would be at stake.
- **A deployment is being considered**, and it cannot rely on `synchronize`.

## Decisions inside it

- **The same path in every environment.** `migrationsRun: true`: the app
  applies pending migrations at boot in dev, CI and production. Keeping
  `synchronize` in dev and migrations in production was rejected: the two
  would drift, and the first time the migrations ran would be on the real
  database. The `e2e` CI job boots on an empty database, so it builds the whole
  schema from the migrations on every run.
- **One description of the connection.** `database/database.config.ts` builds
  the options for the app (from ConfigService) and for the TypeORM CLI (from
  `process.env`), so a migration is generated against the connection the app
  uses. Entities and migrations are found by file role (`*.entity.ts`,
  `*.migration.ts`), so there is no list to keep in step.
- **Drift is a CI failure.** After the e2e stack has booted, `npm run
  migration:check` (`migration:generate --check`) fails if an entity changed
  without a migration. Checked by hand: adding a column to an entity makes it
  exit 1.
- **Generated, then reviewed.** `make migration-generate NAME=...` writes the
  migration from the entity diff, renames it to the `.migration.ts` role and
  formats it. The SQL must be read before it is committed: a rename is
  generated as a drop and an add, which loses the column's data.
- **A database from before the migrations is rebuilt.** A database created by
  the old `synchronize` has the baseline's tables but no record of it, so the
  first boot fails with "already exists". It holds dev data only: `make
  wipe-db`, and the next boot builds it from the migrations.
  *Amended 2026-10-24 (HYP-85):* a `make migration-adopt` target recorded the
  baseline as applied instead, through TypeORM's `--fake`, which marks every
  pending migration and not only the baseline. Every database of that era was
  already migrated or disposable, so the target was removed.

## Alternatives considered

- **Migrations only in production, `synchronize` in dev**: rejected, see above.
- **Running migrations as a separate deploy step**: one more step to forget,
  and nothing in this stack needs it.
- **Hand-written baseline**: the generated one is checked against a database
  built from it (`migration:check` reports no change), which a hand-written one
  would not be.

## Consequences

- Every entity change comes with a migration, and a review of its SQL.
- A failing migration stops the app from booting. That is the point: the app
  never runs on a half-built schema.
- Running migrations at boot is fine for one backend instance. With several,
  two could start the same migration at once; that would move them to a
  separate step.
- Data migrations (backfills) are written by hand inside the migration.
- `NODE_ENV` no longer gates `synchronize` (ADR-0003 mentioned it); it still
  gates SQL logging.
