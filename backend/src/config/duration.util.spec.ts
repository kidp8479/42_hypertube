// Unit spec for parseDuration: the `<number><s|m|h|d>` strings the env schema
// accepts become milliseconds.
import { parseDuration } from './duration.util';

describe('parseDuration', () => {
  it.each([
    ['30s', 30_000],
    ['15m', 900_000],
    ['2h', 7_200_000],
    ['7d', 604_800_000],
  ])('reads %s as %d ms', (text, ms) => {
    expect(parseDuration(text)).toBe(ms);
  });

  it.each(['', '7', 'd', '1w', '1.5h', '-5m', '7 d'])(
    'rejects %p, which the env schema never lets through',
    (text) => {
      expect(() => parseDuration(text)).toThrow(/duration/i);
    },
  );
});
