import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

export const OAUTH_STATE_COOKIE = 'oauth_state';

const STATE_COOKIE_PATH = '/auth';
const STATE_COOKIE_MAX_AGE_MS = 10 * 60 * 1000;

const readCookie = (header: string | undefined, name: string) =>
  header
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);

// timingSafeEqual throws on buffers of different lengths, so length is
// compared first; it is not secret, the nonce size is fixed.
const sameValue = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * OAuth `state` store for `passport-oauth2` that binds the handshake to the
 * browser that started it, without a server-side session (the app is
 * stateless JWT). `store()` sets a random nonce in a short-lived cookie and
 * sends the same value as `state`; the callback accepts only when both
 * match, so a callback URL replayed in another browser is rejected (login
 * CSRF, see ADR-0007). A signed `state` alone would not do it: the attacker
 * could fetch one from our own `/login` and replay it.
 */
export class CookieStateStore {
  store(req: Request, callback: (err: Error | null, state?: string) => void) {
    if (!req.res) {
      callback(new Error('OAuth state store needs the Express response'));
      return;
    }
    const nonce = randomBytes(24).toString('base64url');
    // SameSite=Lax because the callback is a top-level GET from the
    // provider, which Lax still sends. Path=/auth keeps it off other routes.
    req.res.cookie(OAUTH_STATE_COOKIE, nonce, {
      httpOnly: true,
      sameSite: 'lax',
      path: STATE_COOKIE_PATH,
      maxAge: STATE_COOKIE_MAX_AGE_MS,
      secure: process.env.NODE_ENV === 'production',
    });
    callback(null, nonce);
  }

  /**
   * Accepts the callback only when its `state` equals the nonce cookie set
   * by `store()`. The cookie is cleared on every call, pass or fail: a
   * nonce is single-use, and a failed attempt must not leave a live one.
   * Passport turns a `false` here into a 403, so a rejected callback never
   * reaches `validate()`.
   */
  verify(
    req: Request,
    providedState: string | undefined,
    callback: (
      err: Error | null,
      ok?: boolean,
      info?: { message: string },
    ) => void,
  ) {
    const expected = readCookie(req.headers.cookie, OAUTH_STATE_COOKIE);
    // Same Path as at creation, or the browser keeps the cookie.
    req.res?.clearCookie(OAUTH_STATE_COOKIE, { path: STATE_COOKIE_PATH });
    if (!expected || !providedState || !sameValue(expected, providedState)) {
      callback(null, false, {
        message: 'Invalid authorization request state.',
      });
      return;
    }
    callback(null, true);
  }
}
