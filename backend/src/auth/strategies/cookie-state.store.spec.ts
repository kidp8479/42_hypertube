import type { Request } from 'express';
import { CookieStateStore, OAUTH_STATE_COOKIE } from './cookie-state.store';

// Only what the store touches: req.headers.cookie and req.res.cookie() /
// clearCookie(). No Nest module needed.
const buildReq = (cookieHeader?: string) => {
  const cookie = jest.fn();
  const clearCookie = jest.fn();
  const req = {
    headers: { cookie: cookieHeader },
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
  });
});
