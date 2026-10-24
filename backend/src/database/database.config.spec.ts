// Unit spec for databaseOptions: the schema comes from the migrations only
// (ADR-0010), and entities and migrations are found by their file role.
import { databaseOptions } from './database.config';

const ENV: Record<string, string> = {
  DATABASE_HOST: 'db',
  DATABASE_PORT: '5433',
  DATABASE_USER: 'hypertube',
  DATABASE_PASSWORD: 'secret',
  DATABASE_NAME: 'hypertube',
};

describe('databaseOptions', () => {
  const options = databaseOptions((key) => ENV[key]);

  it('never lets the ORM change the schema on its own, and applies migrations at boot', () => {
    expect(options.synchronize).toBe(false);
    expect(options.migrationsRun).toBe(true);
  });

  it('finds entities and migrations by their file role', () => {
    expect(options.entities).toEqual([
      expect.stringMatching(/\*\.entity\.\{ts,js\}$/),
    ]);
    expect(options.migrations).toEqual([
      expect.stringMatching(/migrations[\\/]\*\.migration\.\{ts,js\}$/),
    ]);
  });
});
