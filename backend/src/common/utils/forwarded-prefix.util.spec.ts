// Unit spec for forwardedPrefix: only a plain path from the edge proxy is
// trusted, since it ends up in a Set-Cookie header and the OpenAPI servers.
import type { Request } from 'express';
import { forwardedPrefix } from './forwarded-prefix.util';

const withPrefix = (value?: string | string[]) =>
  ({
    headers: value === undefined ? {} : { 'x-forwarded-prefix': value },
  }) as unknown as Request;

describe('forwardedPrefix', () => {
  it('returns the prefix the edge proxy stripped', () => {
    expect(forwardedPrefix(withPrefix('/api'))).toBe('/api');
    expect(forwardedPrefix(withPrefix('/a/b_c-1'))).toBe('/a/b_c-1');
  });

  it('is empty when the backend is reached directly', () => {
    expect(forwardedPrefix(withPrefix())).toBe('');
  });

  it.each([
    ['a header injection attempt', '/api; Domain=evil.example'],
    ['a scheme', 'https://evil.example'],
    ['a trailing slash', '/api/'],
    ['a relative path', 'api'],
    ['a dot segment', '/../api'],
  ])('is empty for %s', (_, value) => {
    expect(forwardedPrefix(withPrefix(value))).toBe('');
  });

  it('is empty for a header sent twice', () => {
    expect(forwardedPrefix(withPrefix(['/api', '/other']))).toBe('');
  });
});
