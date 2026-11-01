// Recognises a Postgres unique-constraint violation, for the global filter
// and for services that recover from a lost insert race.
import { QueryFailedError } from 'typeorm';

/** Postgres error code for a unique-constraint violation. */
export const UNIQUE_VIOLATION = '23505';

/**
 * Narrows `err` to Postgres refusing a duplicate value, so a caller can
 * answer 409 or retry instead of letting it surface as a 500.
 */
export function isUniqueViolation(err: unknown): err is QueryFailedError {
  return (
    err instanceof QueryFailedError &&
    (err as QueryFailedError & { code?: string }).code === UNIQUE_VIOLATION
  );
}
