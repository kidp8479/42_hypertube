// Unit spec for the refresh cookie helpers: its attributes, the path it keeps
// behind the edge proxy, and how it is read and cleared.
import type { Request, Response } from 'express';
import {
  clearRefreshCookie,
  readRefreshCookie,
  REFRESH_COOKIE,
  setRefreshCookie,
} from './refresh-cookie.util';

const EXPIRES = new Date('2026-10-30T12:00:00.000Z');

// Only what the helpers touch: req.headers (cookie, X-Forwarded-Prefix),
// req.secure, and res.cookie() / clearCookie().
const build = (
  headers: Record<string, string | undefined> = {},
  secure = false,
) => {
  const cookie = jest.fn();
  const clearCookie = jest.fn();
  const req = { headers, secure } as unknown as Request;
  const res = { cookie, clearCookie } as unknown as Response;
  return { req, res, cookie, clearCookie };
};

describe('refresh cookie', () => {
  describe('setRefreshCookie', () => {
    it('is HttpOnly, SameSite=Strict, scoped to the auth routes, and expires with the token', () => {
      const { req, res, cookie } = build();

      setRefreshCookie(req, res, { secret: 's3cret', expiresAt: EXPIRES });

      expect(cookie).toHaveBeenCalledWith(REFRESH_COOKIE, 's3cret', {
        httpOnly: true,
        sameSite: 'strict',
        path: '/auth',
        expires: EXPIRES,
        secure: false,
      });
    });

    it('follows the path the browser sees behind the edge proxy', () => {
      const { req, res, cookie } = build({ 'x-forwarded-prefix': '/api' });

      setRefreshCookie(req, res, { secret: 's', expiresAt: EXPIRES });

      expect(cookie).toHaveBeenCalledWith(
        REFRESH_COOKIE,
        's',
        expect.objectContaining({ path: '/api/auth' }),
      );
    });

    it('is Secure when the request came in over HTTPS', () => {
      const { req, res, cookie } = build({}, true);

      setRefreshCookie(req, res, { secret: 's', expiresAt: EXPIRES });

      expect(cookie).toHaveBeenCalledWith(
        REFRESH_COOKIE,
        's',
        expect.objectContaining({ secure: true }),
      );
    });
  });

  describe('clearRefreshCookie', () => {
    it('expires the cookie on the same path it was set on', () => {
      const { req, res, clearCookie } = build({ 'x-forwarded-prefix': '/api' });

      clearRefreshCookie(req, res);

      expect(clearCookie).toHaveBeenCalledWith(REFRESH_COOKIE, {
        path: '/api/auth',
      });
    });
  });

  describe('readRefreshCookie', () => {
    it('returns the secret among other cookies', () => {
      const { req } = build({
        cookie: `a=1; ${REFRESH_COOKIE}=abc_def-123; b=2`,
      });

      expect(readRefreshCookie(req)).toBe('abc_def-123');
    });

    it('returns undefined when there is none', () => {
      expect(readRefreshCookie(build({ cookie: 'a=1' }).req)).toBeUndefined();
      expect(readRefreshCookie(build().req)).toBeUndefined();
    });
  });
});
