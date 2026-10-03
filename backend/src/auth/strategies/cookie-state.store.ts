import { randomBytes } from 'node:crypto';
import type { Request } from 'express';

export const OAUTH_STATE_COOKIE = 'oauth_state';

const STATE_COOKIE_MAX_AGE_MS = 10 * 60 * 1000;

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
      path: '/auth',
      maxAge: STATE_COOKIE_MAX_AGE_MS,
      secure: process.env.NODE_ENV === 'production',
    });
    callback(null, nonce);
  }
}
