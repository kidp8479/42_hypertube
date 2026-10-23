// Unit spec for CookieStateStore: the OAuth state nonce is bound to the browser
// by a cookie, checked on the callback and cleared either way (login CSRF).
import type { Request } from 'express';
import { CookieStateStore, OAUTH_STATE_COOKIE } from './cookie-state.store';

// Only what the store touches: req.headers (cookie and the proxy's
// X-Forwarded-Prefix), req.secure and req.res.cookie() / clearCookie(). No
// Nest module needed.
const buildReq = (
  cookieHeader?: string,
  { prefix, secure }: { prefix?: string; secure?: boolean } = {},
) => {
  const cookie = jest.fn();
  const clearCookie = jest.fn();
  const req = {
    headers: { cookie: cookieHeader, 'x-forwarded-prefix': prefix },
    secure,
    res: { cookie, clearCookie },
  } as unknown as Request;
  return { req, cookie, clearCookie };
};

describe('CookieStateStore', () => {
  let store: CookieStateStore;

  beforeEach(() => {
    store = new CookieStateStore();
  });

  describe('store', () => {
    it('sets the nonce in a short-lived cookie and hands the same nonce back as state', () => {
      const { req, cookie } = buildReq();
      const callback = jest.fn();

      store.store(req, callback);

      const [error, state] = callback.mock.calls[0] as [null, string];
      expect(error).toBeNull();
      expect(state).toMatch(/^[A-Za-z0-9_-]{32}$/);
      expect(cookie).toHaveBeenCalledWith(OAUTH_STATE_COOKIE, state, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/auth',
        maxAge: 10 * 60 * 1000,
        secure: false,
      });
    });

    it('scopes the cookie to the path the browser sees behind the edge proxy', () => {
      const { req, cookie } = buildReq(undefined, { prefix: '/api' });

      store.store(req, jest.fn());

      expect(cookie).toHaveBeenCalledWith(
        OAUTH_STATE_COOKIE,
        expect.any(String),
        expect.objectContaining({ path: '/api/auth' }),
      );
    });

    it('ignores a forwarded prefix that is not a plain path', () => {
      const { req, cookie } = buildReq(undefined, {
        prefix: '/../x; Domain=a',
      });

      store.store(req, jest.fn());

      expect(cookie).toHaveBeenCalledWith(
        OAUTH_STATE_COOKIE,
        expect.any(String),
        expect.objectContaining({ path: '/auth' }),
      );
    });

    it('is Secure when the request reached the backend over HTTPS (behind the proxy)', () => {
      const { req, cookie } = buildReq(undefined, { secure: true });

      store.store(req, jest.fn());

      expect(cookie).toHaveBeenCalledWith(
        OAUTH_STATE_COOKIE,
        expect.any(String),
        expect.objectContaining({ secure: true }),
      );
    });

    it('fails instead of crashing when the request carries no response', () => {
      const callback = jest.fn();

      store.store({} as unknown as Request, callback);

      expect(callback).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('verify', () => {
    it('accepts when the cookie and the state match', () => {
      const { req } = buildReq(`other=1; ${OAUTH_STATE_COOKIE}=abc123; x=y`);
      const callback = jest.fn();

      store.verify(req, 'abc123', callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it.each([
      ['there is no cookie header', undefined, 'abc123'],
      ['the state cookie is missing', 'other=1', 'abc123'],
      [
        'the cookie and the state differ',
        `${OAUTH_STATE_COOKIE}=abc123`,
        'zzz999',
      ],
      [
        'the state has a different length',
        `${OAUTH_STATE_COOKIE}=abc123`,
        'abc',
      ],
      [
        'the callback carries no state',
        `${OAUTH_STATE_COOKIE}=abc123`,
        undefined,
      ],
    ])('rejects when %s', (_case, cookieHeader, providedState) => {
      const { req } = buildReq(cookieHeader);
      const callback = jest.fn();

      store.verify(req, providedState, callback);

      expect(callback).toHaveBeenCalledWith(null, false, {
        message: expect.any(String) as string,
      });
    });

    it('clears the cookie whether the check passes or fails', () => {
      const passing = buildReq(`${OAUTH_STATE_COOKIE}=abc123`);
      const failing = buildReq(`${OAUTH_STATE_COOKIE}=abc123`);

      store.verify(passing.req, 'abc123', jest.fn());
      store.verify(failing.req, 'nope', jest.fn());

      const cleared = [passing.clearCookie, failing.clearCookie];
      cleared.forEach((clearCookie) =>
        expect(clearCookie).toHaveBeenCalledWith(OAUTH_STATE_COOKIE, {
          path: '/auth',
        }),
      );
    });

    it('clears the cookie under the same prefixed path it was set on', () => {
      const { req, clearCookie } = buildReq(`${OAUTH_STATE_COOKIE}=abc123`, {
        prefix: '/api',
      });

      store.verify(req, 'abc123', jest.fn());

      expect(clearCookie).toHaveBeenCalledWith(OAUTH_STATE_COOKIE, {
        path: '/api/auth',
      });
    });
  });
});
