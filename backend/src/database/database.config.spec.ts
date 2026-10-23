// Unit spec for databaseOptions: the schema comes from the migrations only
// (ADR-0010), and the app and the TypeORM CLI describe the same connection.
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

  it('reads the connection from the environment', () => {
    expect(options).toMatchObject({
      type: 'postgres',
      host: 'db',
      port: 5433,
      username: 'hypertube',
      password: 'secret',
      database: 'hypertube',
    });
  });

  it('defaults the port when none is given', () => {
    expect(databaseOptions(() => undefined).port).toBe(5432);
  });

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
