// Unit spec for isUniqueViolation: only Postgres's 23505 counts, so any other
// database error still surfaces as a 500.
import { QueryFailedError } from 'typeorm';
import { UNIQUE_VIOLATION, isUniqueViolation } from './unique-violation.util';

const queryError = (code?: string) =>
  Object.assign(new QueryFailedError('INSERT INTO ...', [], new Error()), {
    code,
  });

describe('isUniqueViolation', () => {
  it('recognises a unique-constraint violation', () => {
    expect(isUniqueViolation(queryError(UNIQUE_VIOLATION))).toBe(true);
  });

  it('ignores another database error, such as a foreign-key violation', () => {
    expect(isUniqueViolation(queryError('23503'))).toBe(false);
  });

  it('ignores an error that is not a query failure, even with the code', () => {
    expect(
      isUniqueViolation(Object.assign(new Error(), { code: UNIQUE_VIOLATION })),
    ).toBe(false);
  });
});
