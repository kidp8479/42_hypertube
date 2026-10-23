import { join } from 'node:path';
import type { DataSourceOptions } from 'typeorm';

type PostgresOptions = Extract<DataSourceOptions, { type: 'postgres' }>;

// `src` when running through ts-node (the TypeORM CLI), `dist` when compiled:
// the same relative globs find the entities and the migrations in both.
const SRC = join(__dirname, '..');

/**
 * The one place the database connection is described, shared by the running
 * app (values from ConfigService) and the TypeORM CLI (values from
 * `process.env`), so a migration is generated against exactly the connection
 * the app uses.
 *
 * The schema is built by the migrations alone: `synchronize` stays off in
 * every environment, and the app applies pending migrations at boot, so dev,
 * CI and production take the same path (ADR-0010). Entities are found by the
 * `*.entity` file role (CONTRIBUTING > File naming), so a new entity is seen
 * by the CLI without a list to keep in step.
 */
export function databaseOptions(
  read: (key: string) => string | undefined,
): PostgresOptions {
  return {
    type: 'postgres',
    host: read('DATABASE_HOST'),
    port: Number(read('DATABASE_PORT') ?? 5432),
    username: read('DATABASE_USER'),
    password: read('DATABASE_PASSWORD'),
    database: read('DATABASE_NAME'),
    entities: [join(SRC, '**', '*.entity.{ts,js}')],
    migrations: [join(SRC, 'migrations', '*.migration.{ts,js}')],
    synchronize: false,
    migrationsRun: true,
  };
}
