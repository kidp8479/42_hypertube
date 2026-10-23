import { DataSource } from 'typeorm';
import { databaseOptions } from './database.config';

/**
 * Data source of the TypeORM CLI (`npm run typeorm`, `migration:*`): the
 * connection of the app, read from the environment of the process. Run it
 * inside the backend container, where `DATABASE_HOST` is the `db` service.
 */
export default new DataSource({
  ...databaseOptions((key) => process.env[key]),
  // The CLI applies migrations when asked to, not as a side effect of loading.
  migrationsRun: false,
});
