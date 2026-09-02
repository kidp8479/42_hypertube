import { ArgumentsHost, Catch, ConflictException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { QueryFailedError } from 'typeorm';

/** Postgres error code for a unique-constraint violation. */
const UNIQUE_VIOLATION = '23505';

/**
 * Turns a Postgres unique-violation into a 409 instead of letting it
 * surface as an unhandled 500 that also dumps the SQL error to the logs
 * (hit today on a duplicate email/username at registration).
 *
 * The message stays generic - it must not reveal which value clashed
 * (account enumeration). HYP-32 replaces this with a uniform-response
 * flow on registration specifically; this filter is the safety net for
 * every other unique constraint.
 */
@Catch(QueryFailedError)
export class QueryFailedFilter extends BaseExceptionFilter {
  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const code = (exception as QueryFailedError & { code?: string }).code;
    if (code === UNIQUE_VIOLATION) {
      super.catch(new ConflictException('Resource already exists'), host);
      return;
    }
    super.catch(exception, host);
  }
}
