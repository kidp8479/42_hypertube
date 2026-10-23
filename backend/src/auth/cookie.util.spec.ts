// Unit spec for the cookie helpers the auth cookies share: reading one, the
// path behind the edge proxy, and when a cookie must be Secure.
import type { Request } from 'express';
import { authCookiePath, isSecureRequest, readCookie } from './cookie.util';

const req = (
  headers: Record<string, string | undefined> = {},
  secure?: boolean,
) => ({ headers, secure }) as unknown as Request;

describe('readCookie', () => {
  it('finds a cookie by name among others', () => {
    expect(readCookie('a=1; b=2; c=3', 'b')).toBe('2');
  });

  it('does not match a cookie whose name merely starts with the wanted one', () => {
    expect(readCookie('refresh_token_old=x', 'refresh_token')).toBeUndefined();
  });

  it('returns undefined for no header', () => {
    expect(readCookie(undefined, 'a')).toBeUndefined();
  });
});

describe('authCookiePath', () => {
  it('is /auth when the backend is reached directly', () => {
    expect(authCookiePath(req())).toBe('/auth');
  });

  it('is prefixed with what the proxy says it stripped', () => {
    expect(authCookiePath(req({ 'x-forwarded-prefix': '/api' }))).toBe(
      '/api/auth',
    );
  });

  it.each(['/../x', '/a;b', 'api', '/a b', '//'])(
    'ignores %p, which is not a plain path (it ends up in Set-Cookie)',
    (prefix) => {
      expect(authCookiePath(req({ 'x-forwarded-prefix': prefix }))).toBe(
        '/auth',
      );
    },
  );
});

describe('isSecureRequest', () => {
  const original = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = original;
  });

  it('is true over HTTPS, false over plain HTTP in development', () => {
    process.env.NODE_ENV = 'development';

    expect(isSecureRequest(req({}, true))).toBe(true);
    expect(isSecureRequest(req({}, false))).toBe(false);
  });

  it('is always true in production', () => {
    process.env.NODE_ENV = 'production';

    expect(isSecureRequest(req({}, false))).toBe(true);
  });
});
