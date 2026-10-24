// Unit spec for the refresh cookie helpers, for what the HTTP spec
// (auth.session.spec.ts) does not reach: Secure over HTTPS, and clearing on
// the prefixed path.
import type { Request, Response } from 'express';
import {
  clearRefreshCookie,
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
});
