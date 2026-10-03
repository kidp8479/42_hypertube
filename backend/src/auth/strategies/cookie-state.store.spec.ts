import type { Request } from 'express';
import { CookieStateStore, OAUTH_STATE_COOKIE } from './cookie-state.store';

// Only what the store touches: req.res.cookie(). No Nest module needed.
const buildReq = () => {
  const cookie = jest.fn();
  return { req: { res: { cookie } } as unknown as Request, cookie };
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
});
