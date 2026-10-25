// Recognises a Postgres unique-constraint violation, for the global filter
// and for services that recover from a lost insert race.
import { QueryFailedError } from 'typeorm';

/** Postgres error code for a unique-constraint violation. */
export const UNIQUE_VIOLATION = '23505';

export function isUniqueViolation(err: unknown): err is QueryFailedError {
  return (
    err instanceof QueryFailedError &&
    (err as QueryFailedError & { code?: string }).code === UNIQUE_VIOLATION
  );
}
