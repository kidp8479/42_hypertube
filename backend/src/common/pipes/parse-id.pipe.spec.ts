// Unit spec for ParseIdPipe: a path id is a positive integer that fits the
// Postgres `integer` column, anything else is a 400.
import { BadRequestException } from '@nestjs/common';
import { ParseIdPipe } from './parse-id.pipe';

describe('ParseIdPipe', () => {
  const pipe = new ParseIdPipe();

  it('turns a numeric string into a number', () => {
    expect(pipe.transform('42')).toBe(42);
  });

  it('accepts the largest id the column holds', () => {
    expect(pipe.transform('2147483647')).toBe(2147483647);
  });

  it.each(['abc', '', '-1', '0', '1.5', '1e3', ' 7', '2147483648'])(
    'rejects %p with 400',
    (value) => {
      expect(() => pipe.transform(value)).toThrow(BadRequestException);
    },
  );
});
