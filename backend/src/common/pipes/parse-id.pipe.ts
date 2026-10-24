// Route-parameter pipe for numeric ids.
import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

/** Largest value of a Postgres `integer` (SERIAL) column. */
const MAX_INTEGER_ID = 2_147_483_647;

/**
 * Parses a path id into a number: digits only, from 1 to the largest value an
 * `integer` column holds. Nest's ParseIntPipe takes any integer, and an id
 * past that range makes Postgres fail the query, which surfaces as a 500
 * instead of the 400 a malformed id deserves.
 */
@Injectable()
export class ParseIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const id = /^[1-9]\d*$/.test(value) ? Number(value) : NaN;
    if (Number.isNaN(id) || id > MAX_INTEGER_ID) {
      throw new BadRequestException('id must be a positive integer');
    }
    return id;
  }
}
